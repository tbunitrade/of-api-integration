// backend/of-software/src/automate/api-vault-media.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalApiClient } from 'src/integrations/external/external-api.client';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';

@Injectable()
export class ApiVaultMediaService {
  constructor(
    private readonly externalApi: ExternalApiClient,
    private readonly modelPlatformService: ModelPlatformService,
  ) {}

  private async _getAccountIdByModelPlatformId(modelPlatformId: number): Promise<string> {
    if (!modelPlatformId) throw new BadRequestException('modelPlatformId is required');

    const mp = await this.modelPlatformService.findById(modelPlatformId);
    if (!mp) throw new BadRequestException(`ModelPlatform not found: ${modelPlatformId}`);

    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) {
      throw new BadRequestException(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);
    }
    return accountId;
  }

  async getVaultList(modelPlatformId: number, listId: string) {
    const accountId = await this._getAccountIdByModelPlatformId(Number(modelPlatformId));

    const lid = String(listId || '').trim();
    if (!lid) throw new BadRequestException('listId is required');

    console.log('[ApiVaultMediaService] getVaultList', { modelPlatformId, accountId, listId: lid });

    // Внешний вызов
    return this.externalApi.getVaultList(accountId, lid);
  }

  async addMediaToVaultList(dto: any) {
    const modelPlatformId = Number(dto?.modelPlatformId);
    const accountId = await this._getAccountIdByModelPlatformId(modelPlatformId);

    const listId = String(dto?.listId || '').trim();
    if (!listId) throw new BadRequestException('listId is required');

    const mediaIds = Array.isArray(dto?.mediaIds)
      ? dto.mediaIds.map((x: any) => String(x ?? '').trim()).filter(Boolean)
      : [];

    if (!mediaIds.length) throw new BadRequestException('mediaIds must be a non-empty array');

    console.log('[ApiVaultMediaService] addMediaToVaultList', {
      modelPlatformId,
      accountId,
      listId,
      mediaIdsCount: mediaIds.length,
    });

    return this.externalApi.addMediaToVaultList(accountId, listId, mediaIds);
  }

  async getVaultLists(modelPlatformId: number, params?: any) {
    const accountId = await this._getAccountIdByModelPlatformId(Number(modelPlatformId));
    console.log('[ApiVaultMediaService] getVaultLists', { modelPlatformId, accountId, params });
    return this.externalApi.getVaultLists(accountId, params);
  }

  async getVaultMediaList(modelPlatformId: number, params?: any) {
    const accountId = await this._getAccountIdByModelPlatformId(Number(modelPlatformId));
    console.log('[ApiVaultMediaService] getVaultMediaList', { modelPlatformId, accountId, params });
    return this.externalApi.getVaultMediaList(accountId, params);
  }

  async getVaultMedia(modelPlatformId: number, mediaId: string) {
    const accountId = await this._getAccountIdByModelPlatformId(Number(modelPlatformId));
    const mid = String(mediaId || '').trim();
    if (!mid) throw new BadRequestException('mediaId is required');

    console.log('[ApiVaultMediaService] getVaultMedia', { modelPlatformId, accountId, mediaId: mid });
    return this.externalApi.getVaultMedia(accountId, mid);
  }
}
