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

  //find method
  // backend/of-software/src/automate/api-vault-media.service.ts
  // backend/of-software/src/automate/api-vault-media.service.ts
  async downloadFromCdn(modelPlatformId: number, cdnUrl: string): Promise<{ buffer: Buffer; contentType?: string }> {
    if (!cdnUrl) throw new Error('cdnUrl is required');

    const accountId = await this._getAccountIdByModelPlatformId(Number(modelPlatformId));
    const cdnUrlStr = String(cdnUrl);

    console.log('[ApiVaultMediaService] downloadFromCdn', {
      modelPlatformId,
      accountId,
      cdnUrlLen: cdnUrlStr.length,
      hadQuery: (() => { try { return !!new URL(cdnUrlStr).search; } catch { return null; } })(),
    });

    // ✅ Provider docs: GET /api/{account}/media/download/{cdnUrl}
    const cdnEncoded = encodeURIComponent(cdnUrlStr);

    const r1 = await this.externalApi.requestBinary({
      method: 'GET',
      url: `/api/${accountId}/media/download/${cdnEncoded}`,
      timeout: 20_000,
    });

    const status1 = (r1 as any)?.status;
    if (status1 && status1 >= 200 && status1 < 300) {
      const ct1 = r1?.headers?.['content-type'];
      const buffer1 = Buffer.isBuffer(r1.data) ? r1.data : Buffer.from(r1.data);
      return { buffer: buffer1, contentType: ct1 };
    }

    // Fallback: some providers support query-param form (keep full signed URL!)
    const r2 = await this.externalApi.requestBinary({
      method: 'GET',
      url: `/api/${accountId}/media/download`,
      params: { url: cdnUrlStr }, // если у них именно `url`
      timeout: 20_000,
    });

    const status2 = (r2 as any)?.status;
    if (!status2 || status2 < 200 || status2 >= 300) {
      throw new Error(`downloadFromCdn failed: status=${status2 || status1}`);
    }

    const ct2 = r2?.headers?.['content-type'];
    const buffer2 = Buffer.isBuffer(r2.data) ? r2.data : Buffer.from(r2.data);
    return { buffer: buffer2, contentType: ct2 };
  }


}
