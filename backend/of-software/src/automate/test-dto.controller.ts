// src/automate/test.controller.ts

import { Controller, Post, Body, Logger } from '@nestjs/common';
import { MessageDto } from 'src/dtos/message.dto';

@Controller('test-dto')
export class TestController {
  private readonly logger = new Logger(TestController.name);


  @Post('message')
  async testMessage(@Body() dto: MessageDto) {
    this.logger.log(`Received free_preview: ${dto.free_preview}`);
    return{
      success : true,
      free_preview_received : dto.free_preview,
      received: dto
    }
  }
}
