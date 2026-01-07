import { Controller, Get, Body, Query, Post, BadRequestException } from '@nestjs/common';
import { AutomateService } from './automate.service';
import { ApiTags } from '@nestjs/swagger';
import {SendMassMessageDto} from "../dtos/send-mass-message.dto";

@Controller('automate')
@ApiTags('automate')
export class AutomateController {
  constructor(private readonly automateService: AutomateService) {}

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

  // @Get('start')
  // async start() {
  //   await this.automateService.startMessage();
  //   return true;
  // }
}
