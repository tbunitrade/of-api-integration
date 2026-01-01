import { Controller, Get, Body, Query, Post } from '@nestjs/common';
import { AutomateService } from './automate.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('automate')
@ApiTags('automate')
export class AutomateController {
  constructor(private readonly automateService: AutomateService) {}

  @Get('audience-lists')
  getAudienceLists(@Query('modelPlatformId') modelPlatformId: string) {
    return this.automateService.getAudienceLists(Number(modelPlatformId));
  }

  @Post('send-mass-message')
  sendMassMessage(@Body() body: any) {
    return this.automateService.startMassMessage(body);
  }

  // @Get('start')
  // async start() {
  //   await this.automateService.startMessage();
  //   return true;
  // }
}
