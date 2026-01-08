import { Controller, Get, Body, Query, Post, BadRequestException } from '@nestjs/common';
import { AutomateService } from './automate.service';
import { ApiTags } from '@nestjs/swagger';
import {SendMassMessageDto} from "../dtos/send-mass-message.dto";
import { ApiVaultMediaService } from './api-vault-media.service';
import { ApiMassMessageService } from "./api-mass-message.service";

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
}
