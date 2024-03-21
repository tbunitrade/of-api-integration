import { Controller, Get } from '@nestjs/common';
import { AutomateService } from './automate.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('automate')
@ApiTags('automate')
export class AutomateController {
  constructor(private readonly automateService: AutomateService) {}

  @Get('start')
  async start() {
    await this.automateService.start();
    return true;
  }
}
