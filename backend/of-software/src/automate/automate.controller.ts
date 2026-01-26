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

  @Get('vault-lists')
  getVaultLists(@Query('modelPlatformId') modelPlatformId: string) {
    return this.apiVaultMediaService.getVaultLists(Number(modelPlatformId));
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

  // @Get('start')
  // async start() {
  //   await this.automateService.startMessage();
  //   return true;
  // }

  @Get('proxy-img')
  async proxyImg(@Query('url') url: string, @Res() res: Response) {
    if (!url) throw new BadRequestException('url is required');

    try {
      // ВАЖНО: НЕ делать decodeURIComponent(url) здесь.
      // Express уже декодирует query-параметры автоматически.
      const r = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          // иногда помогает:
          // 'Referer': 'https://onlyfans.com/',
        },
        // можно разрешить любые статусы и обработать вручную
        validateStatus: () => true,
      });

      if (r.status < 200 || r.status >= 300) {
        // Логни тело (первые 300-500 символов), чтобы увидеть 403/HTML
        const bodyPreview = Buffer.isBuffer(r.data)
          ? Buffer.from(r.data).toString('utf8', 0, 500)
          : String(r.data).slice(0, 500);

        console.log('[proxy-img] upstream non-2xx', {
          status: r.status,
          ct: r.headers?.['content-type'],
          bodyPreview,
        });

        return res.status(502).send('proxy-img upstream failed');
      }

      const ct = r.headers?.['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      return res.send(Buffer.from(r.data));
    } catch (e: any) {
      console.log('[proxy-img] error', String(e?.message || e));
      return res.status(502).send('proxy-img failed');
    }
  }

}
