// backend/of-software/src/automate/api-mass-message.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalApiClient } from 'src/integrations/external/external-api.client';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';

@Injectable()
export class ApiMassMessageService {
  constructor(
    private readonly externalApi: ExternalApiClient,
    private readonly modelPlatformService: ModelPlatformService,
  ) {}

  private _normalizeListNames(input: any): string[] {
    const arr = Array.isArray(input) ? input : [];
    const out = arr
      .map((x) => String(x ?? '').trim())
      .filter(Boolean);

    // uniq (case-insensitive) but keep original
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const name of out) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(name);
      }
    }
    return uniq;
  }

  private _extractProviderListNames(providerRes: any): string[] {
    // Поддержим несколько возможных форматов ответа, чтобы не ломаться:
    // 1) ["Fans", "Following"]
    // 2) [{name:"Fans", id:1}, ...]
    // 3) { lists: [...] } / { data: [...] } / { data: { lists: [...] } }
    const candidate =
      providerRes?.lists ??
      providerRes?.data?.lists ??
      providerRes?.data?.list ??
      providerRes?.data ??
      providerRes;

    if (!Array.isArray(candidate)) return [];

    if (candidate.length && typeof candidate[0] === 'string') {
      return this._normalizeListNames(candidate);
    }

    // objects
    const names = candidate
      .map((x: any) => (x?.name ?? x?.title ?? x?.label))
      .filter(Boolean);

    return this._normalizeListNames(names);
  }

  private async _validateAudienceLists(accountId: string, dto: any) {
    const userLists = this._normalizeListNames(dto?.userLists);
    const excludedLists = this._normalizeListNames(dto?.excludedLists);

    // Если ничего не передали — валидировать нечего
    if (!userLists.length && !excludedLists.length) {
      return { userLists, excludedLists };
    }

    const providerRes = await this.externalApi.getAudienceLists(accountId);
    const providerNames = this._extractProviderListNames(providerRes);

    const providerSet = new Set(providerNames.map((x) => x.toLowerCase()));

    const missingUser = userLists.filter((x) => !providerSet.has(x.toLowerCase()));
    const missingExcluded = excludedLists.filter((x) => !providerSet.has(x.toLowerCase()));

    if (missingUser.length || missingExcluded.length) {
      console.log('[ApiMassMessageService] audience lists mismatch', {
        accountId,
        missingUser,
        missingExcluded,
        providerCount: providerNames.length,
      });

      // Жёстко валим — это и есть "подтвердить/обновить"
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

    // ВАЖНО: accountId берём из ofid_username (= acct_...)
    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) {
      throw new BadRequestException(
        `Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`
      );
    }

    // 1) Подтверждаем/обновляем lists (валидация на актуальность)
    const { userLists, excludedLists } = await this._validateAudienceLists(accountId, dto);

    // 2) Собираем payload
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
    const lists = this._extractProviderListNames(providersRes);

    return { lists }
  }
}
