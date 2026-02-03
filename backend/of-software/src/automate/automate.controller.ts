import { Controller, Get, Body, Query, Res, Post, BadRequestException } from '@nestjs/common';
import { AutomateService } from './automate.service';
import { ApiTags } from '@nestjs/swagger';
import {SendMassMessageDto} from "../dtos/send-mass-message.dto";
import { ApiVaultMediaService } from './api-vault-media.service';
import { ApiMassMessageService } from "./api-mass-message.service";

import axios from 'axios';
import { Response } from 'express';



@Controller('automate')
@ApiTags('automate')
export class AutomateController {
  constructor(
    private readonly automateService: AutomateService,
    //private readonly apiMassMessageService: ApiMassMessageService,
    private readonly apiVaultMediaService: ApiVaultMediaService,
  ) {}

  @Get('audience-lists')
  getAudienceLists(@Query('modelPlatformId') modelPlatformId: string) {
    const id = Number(modelPlatformId);
    if ( !id ) throw new BadRequestException('modelPlatformId is required');
    //return this.automateService.getAudienceLists(Number(modelPlatformId));

    return this.automateService.getAudienceLists(id);
  }

  @Post('send-mass-message')
  sendMassMessage(@Body() dto: SendMassMessageDto) {
    return this.automateService.startMassMessage(dto);
  }

  @Get('vault-list')
  async getVaultList(
    @Query('modelPlatformId') modelPlatformId: string,
    @Query('listId') listId: string,
  ) {
    return this.apiVaultMediaService.getVaultList(Number(modelPlatformId), String(listId));
  }

  @Post('vault-add-media')
  async addVaultMedia(@Body() body: any) {
    return this.apiVaultMediaService.addMediaToVaultList(body);
  }

  // @Get('vault-lists')
  // getVaultLists(@Query('modelPlatformId') modelPlatformId: string, @Query() q: any) {
  //   const params = { ...q };
  //   delete params.modelPlatformId;
  //   return this.apiVaultMediaService.getVaultLists(Number(modelPlatformId), params);
  // }

  @Get('vault-lists')
  getVaultLists(@Query('modelPlatformId') modelPlatformId: string, @Query() q: any) {
    const params = { ...q };
    delete params.modelPlatformId;

    // allow only these
    const out: any = {};

    if (typeof params.query === 'string' && params.query.trim()) out.query = params.query.trim();

    const limitNum = Number(params.limit);
    if (Number.isFinite(limitNum)) out.limit = Math.min(Math.max(limitNum, 1), 30);

    const offsetNum = Number(params.offset);
    if (Number.isFinite(offsetNum)) out.offset = Math.max(offsetNum, 0);

    return this.apiVaultMediaService.getVaultLists(Number(modelPlatformId), out);
  }

  @Get('vault-media')
  getVaultMediaList(@Query('modelPlatformId') modelPlatformId: string, @Query() q: any) {
    const params = { ...q };
    delete params.modelPlatformId;
    return this.apiVaultMediaService.getVaultMediaList(Number(modelPlatformId), params);
  }

  @Get('vault-media-one')
  getVaultMedia(@Query('modelPlatformId') modelPlatformId: string, @Query('mediaId') mediaId: string) {
    return this.apiVaultMediaService.getVaultMedia(Number(modelPlatformId), mediaId);
  }

  @Get('proxy-img')
  async proxyImg(
    @Query('modelPlatformId') modelPlatformId: string,
    @Query('mediaId') mediaId: string,
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    const mpId = Number(modelPlatformId);
    if (!mpId) throw new BadRequestException('modelPlatformId is required');

    // 1) Получаем targetUrl
    let targetUrl = url;

    if (!targetUrl && mediaId) {
      const one = await this.apiVaultMediaService.getVaultMedia(mpId, String(mediaId));
      const d = (one as any)?.data ?? one;

      targetUrl =
        d?.files?.preview?.url ||
        d?.files?.squarePreview?.url ||
        d?.files?.thumb?.url ||
        d?.files?.full?.url;
    }
    console.log('[proxy-img] target', {
      mpId,
      mediaId,
      hasUrl: !!url,
      targetHost: (() => {
        try { return new URL(String(targetUrl)).host; } catch { return 'bad-url'; }
      })(),
      targetUrlLen: String(targetUrl || '').length,
    });

    if (!targetUrl) throw new BadRequestException('mediaId or url is required');

    console.log('[proxy-img] target', {
      mpId,
      mediaId,
      hasUrl: !!url,
      targetHost: (() => {
        try { return new URL(String(targetUrl)).host; } catch { return 'bad-url'; }
      })(),
      targetUrlLen: String(targetUrl || '').length,
    });

    try {
      // 2) Критично: качаем через провайдера, а не напрямую с cdn2
      const out = await this.apiVaultMediaService.downloadFromCdn(mpId, targetUrl);

      const ct = out?.contentType || 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      console.log('[proxy-img] resolved', { mpId, mediaId, hasUrl: !!url, targetUrlLen: (targetUrl || '').length });

      return res.send(out.buffer);
    } catch (e: any) {
      console.log('[proxy-img] error', String(e?.message || e));
      return res.status(502).send('proxy-img failed');
    }
  }

  // @Get('start')
  // async start() {
  //   await this.automateService.startMessage();
  //   return true;
  // }

}
