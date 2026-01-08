// backend/of-software/src/automate/api-mass-message.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalApiClient } from 'src/integrations/external/external-api.client';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';

type ProviderList = { id: any; name: string; type?: string };

@Injectable()
export class ApiMassMessageService {
  constructor(
    private readonly externalApi: ExternalApiClient,
    private readonly modelPlatformService: ModelPlatformService,
  ) {}

  /**
   * dto.userLists / dto.excludedLists приходят как массив "токенов списка":
   * - default list: "fans", "following", "tagged" ...
   * - custom list:  1224114714 (или "1224114714")
   */
  private _normalizeListNames(input: any): string[] {
    const arr = Array.isArray(input) ? input : [];
    const out = arr
      .map((x) => String(x ?? '').trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const token of out) {
      const key = token.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(token);
      }
    }
    return uniq;
  }

  private _extractProviderLists(providerRes: any): ProviderList[] {
    const candidate =
      providerRes?.lists ??
      providerRes?.data?.lists ??
      providerRes?.data?.list ??
      providerRes?.data ??
      providerRes;

    if (!Array.isArray(candidate)) return [];

    return candidate
      .map((x: any) => {
        if (typeof x === 'string' || typeof x === 'number') {
          const v = String(x).trim();
          return { id: v, name: v };
        }

        const id = x?.id ?? x?.key ?? x?.type ?? x?.slug ?? x?.name;
        const name = String(x?.name ?? x?.title ?? x?.label ?? x?.id ?? '').trim();
        const type = x?.type;

        return { id, name, type };
      })
      .filter((x: any) => x?.id != null && x?.name);
  }

  private _buildProviderKeySet(lists: ProviderList[]): Set<string> {
    const set = new Set<string>();
    for (const l of lists) {
      set.add(String(l.id).toLowerCase());

      // запасной вариант: если прилетит name/type
      if (l.name) set.add(String(l.name).toLowerCase());
      if (l.type) set.add(String(l.type).toLowerCase());
    }
    return set;
  }

  private async _validateAudienceLists(accountId: string, dto: any) {
    const userLists = this._normalizeListNames(dto?.userLists);
    const excludedLists = this._normalizeListNames(dto?.excludedLists);

    if (!userLists.length && !excludedLists.length) {
      return { userLists, excludedLists };
    }

    // ЕДИНСТВЕННЫЙ источник истины: всегда грузим все списки
    const providerLists = await this._loadAllProviderLists(accountId);

    // Если провайдер вернул пусто — НЕ блокируем mass-message (иначе будет флапать UX)
    if (!providerLists.length) {
      console.log('[ApiMassMessageService] provider lists empty, skip strict validation', {
        accountId,
        userLists,
        excludedLists,
      });
      return { userLists, excludedLists };
    }

    const providerSet = this._buildProviderKeySet(providerLists);

    const missingUser = userLists.filter((x) => !providerSet.has(String(x).toLowerCase()));
    const missingExcluded = excludedLists.filter((x) => !providerSet.has(String(x).toLowerCase()));

    if (missingUser.length || missingExcluded.length) {
      console.log('[ApiMassMessageService] audience lists mismatch', {
        accountId,
        missingUser,
        missingExcluded,
        providerCount: providerLists.length,
      });

      throw new BadRequestException(
        `Audience lists are outdated. Missing: ` +
        `${missingUser.length ? `userLists=[${missingUser.join(', ')}] ` : ''}` +
        `${missingExcluded.length ? `excludedLists=[${missingExcluded.join(', ')}]` : ''}`.trim(),
      );
    }

    return { userLists, excludedLists };
  }

  async startMassMessage(dto: any) {
    const modelPlatformId = Number(dto?.modelPlatformId);
    const text = String(dto?.text || '').trim();

    if (!modelPlatformId) throw new BadRequestException('modelPlatformId is required');
    if (!text) throw new BadRequestException('text is required');

    const mp = await this.modelPlatformService.findById(modelPlatformId);
    if (!mp) throw new BadRequestException(`ModelPlatform not found: ${modelPlatformId}`);

    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) {
      throw new BadRequestException(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);
    }

    const { userLists, excludedLists } = await this._validateAudienceLists(accountId, dto);

    //const userLists = this._normalizeListNames(dto?.userLists);
    //const excludedLists = this._normalizeListNames(dto?.excludedLists);
    const userIds = Array.isArray(dto?.userIds) ? dto.userIds : [];

    const payload = {
      text,
      userLists,
      excludedLists,
      userIds
    };

    console.log('[ApiMassMessageService] sending', {
      modelPlatformId,
      accountId,
      textLen: text.length,
      userLists: userLists.length,
      excludedLists: excludedLists.length,
      userIds: payload.userIds?.length,
    });

    const res = await this.externalApi.sendMassMessage(accountId, payload);
    console.log('[ApiMassMessageService] provider response', res);
    return res;
  }

  async getAudienceLists(modelPlatformId: number) {
    const mp = await this.modelPlatformService.findById(modelPlatformId);
    if (!mp) throw new BadRequestException(`ModelPlatform not found: ${modelPlatformId}`);

    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) throw new BadRequestException(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);

    // Возвращаем ПОЛНЫЙ список, а не первую страницу
    const lists = await this._loadAllProviderLists(accountId);
    return { lists };
  }

  private async _loadAllProviderLists(accountId: string): Promise<ProviderList[]> {
    const all: ProviderList[] = [];

    let offset: any = undefined;
    let guard = 0;

    while (guard++ < 50) {

      // ВАЖНО: этот вызов предполагает поддержку params в ExternalApiClient.getAudienceLists
      const res = await this.externalApi.getAudienceLists(
        accountId,
        offset != null ? { offset, limit: 50 } : { limit: 50},
      );

      if (guard === 1) {
        console.log('[ApiMassMessageService] audience FIRST PAGE raw', {
          type: typeof res,
          isArray: Array.isArray(res),
          keys: res && typeof res === 'object' ? Object.keys(res) : [],
          dataKeys: res?.data && typeof res.data === 'object' ? Object.keys(res.data) : [],
          metaKeys: res?._meta && typeof res._meta === 'object' ? Object.keys(res._meta) : [],
          sample: Array.isArray(res)
            ? res.slice(0, 5)
            : (Array.isArray(res?.data) ? res.data.slice(0, 5) : null),
        });
      }

      const page = this._extractProviderLists(res);
      if (page.length) all.push(...page);

      //const hasMore = Boolean(res?.data?.hasMore ?? res?.hasMore);
      const hasMore = Boolean(
        res?.data?.hasMore ??
        res?.hasMore ??
        res?._pagination?.hasMore ??
        res?._pagination?.has_more ??
        res?._meta?.hasMore ??
        res?._meta?._pagination?.hasMore ??
        res?._meta?._pagination?.has_more
      );


      //const nextOffset = res?.data?.nextOffset ?? res?.nextOffset;
      const nextOffset =
        res?.data?.nextOffset ??
        res?.nextOffset ??
        res?._pagination?.nextOffset ??
        res?._pagination?.next_offset ??
        res?._meta?.nextOffset ??
        res?._meta?._pagination?.nextOffset ??
        res?._meta?._pagination?.next_offset;


      if (!hasMore || nextOffset == null) break;
      offset = nextOffset;

      if (guard === 1) {
        console.log('[ApiMassMessageService 2] audience raw first page keys', {
          keys: Object.keys(res || {}),
          dataKeys: Object.keys(res?.data || {}),
          metaKeys: Object.keys(res?._meta || {}),
        });
      }

      if (guard === 1) {
        console.log('[ApiMassMessageService] audience _pagination keys', {
          paginationKeys: res?._pagination && typeof res._pagination === 'object' ? Object.keys(res._pagination) : [],
          pagination: res?._pagination,
        });
      }
    }

    // uniq по id (case-insensitive) + сохраняем порядок
    const seen = new Set<string>();
    const uniq: ProviderList[] = [];
    for (const l of all) {
      const k = String(l.id).toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(l);
      }
    }

    return uniq;
  }
}
