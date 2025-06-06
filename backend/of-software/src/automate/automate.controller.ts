import { Controller, Get } from '@nestjs/common';
import { AutomateService } from './automate.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('automate')
@ApiTags('automate')
export class AutomateController {
  constructor(private readonly automateService: AutomateService) {}

  @Get('start')
  async start() {
    await this.automateService.startMessage();
    return true;
  }

  @Get('test-login')
  async testLogin() {
    await this.automateService.testLogin();
    return { message: 'testLogin completed — смотри pm2 logs' };
  }
}
