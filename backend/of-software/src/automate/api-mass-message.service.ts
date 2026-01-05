// backend/of-software/src/automate/api-mass-message.service.ts
import { Injectable } from '@nestjs/common';
import { ExternalApiClient } from 'src/integrations/external/external-api.client';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';

@Injectable()
export class ApiMassMessageService {
  constructor(
    private readonly externalApi: ExternalApiClient,
    private readonly modelPlatformService: ModelPlatformService,
  ) {}

  async startMassMessage(dto: any) {
    const modelPlatformId = Number(dto?.modelPlatformId);
    const text = String(dto?.text || '').trim();

    if (!modelPlatformId) {
      throw new Error('modelPlatformId is required');
    }
    if (!text) {
      throw new Error('text is required');
    }

    const mp = await this.modelPlatformService.findById(modelPlatformId);
    if (!mp) {
      throw new Error(`ModelPlatform not found: ${modelPlatformId}`);
    }

    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) {
      throw new Error(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);
    }

    // аудитория — то, что выберет UI
    const payload = {
      text,
      audience: {
        userLists: dto?.userLists || [],
        excludedLists: dto?.excludedLists || [],
        userIds: dto?.userIds || [],
      },
      // при необходимости можно докинуть флаги провайдера (без ломания текущего контракта)
    };

    console.log('[ApiMassMessageService] sending', {
      modelPlatformId,
      accountId,
      textLen: text.length,
      userLists: payload.audience.userLists?.length,
      excludedLists: payload.audience.excludedLists?.length,
      userIds: payload.audience.userIds?.length,
    });

    const res = await this.externalApi.sendMassMessage(accountId, payload);

    console.log('[ApiMassMessageService] provider response', res);
    return res;
  }

  async getAudienceLists(modelPlatformId: number) {
    const mp = await this.modelPlatformService.findById(modelPlatformId);
    if (!mp) throw new Error(`ModelPlatform not found: ${modelPlatformId}`);

    const accountId = String(mp.fingerprint_username || '').trim();
    if (!accountId) throw new Error(`Account ID is empty for modelPlatformId=${modelPlatformId}`);

    return this.externalApi.getAudienceLists(accountId);
  }
}
