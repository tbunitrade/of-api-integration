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

    // uniq (case-insensitive) but keep original
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
      // id — это то, что должен отправлять фронт (fans / following / 12345)
      set.add(String(l.id).toLowerCase());

      // запасной вариант: если кто-то всё же пришлёт name/type
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

    const providerRes = await this.externalApi.getAudienceLists(accountId);
    const providerLists = this._extractProviderLists(providerRes);

    const providerLists2 = await this._loadAllProviderLists(accountId);

    // если пусто — не блочим UX
    if (!providerLists2.length) {
      console.log('[ApiMassMessageService] provider lists empty, skip strict validation', { accountId, userLists, excludedLists });
      return { userLists, excludedLists };
    }

    //const providerSet = this._buildProviderKeySet(providerLists);

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

    // accountId берём из ofid_username (= acct_...)
    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) {
      throw new BadRequestException(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);
    }

    const { userLists, excludedLists } = await this._validateAudienceLists(accountId, dto);

    const payload = {
      text,
      userLists,
      excludedLists,
      userIds: Array.isArray(dto?.userIds) ? dto.userIds : [],
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

    const providersRes = await this.externalApi.getAudienceLists(accountId);
    const lists = this._extractProviderLists(providersRes);
    const lists = await this._loadAllProviderLists(accountId);
    return { lists };
  }

  private async _loadAllProviderLists(accountId: string): Promise<ProviderList[]> {
    const all: ProviderList[] = [];

    let offset: any = undefined;
    let guard = 0;

    while (guard++ < 50) {
      const res = await this.externalApi.getAudienceLists(accountId, offset != null ? { offset } : undefined);

      const page = this._extractProviderLists(res);
      if (page.length) all.push(...page);

      const hasMore = Boolean(res?.data?.hasMore ?? res?.hasMore);
      const nextOffset = res?.data?.nextOffset ?? res?.nextOffset;

      if (!hasMore || nextOffset == null) break;
      offset = nextOffset;
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
