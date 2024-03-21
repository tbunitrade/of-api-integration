// src/platform/platform.controller.ts

import {
  Body,
  Controller,
  Post,
  ValidationPipe,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Message } from './message.entity';
import { MessageService } from './message.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessageDto } from 'src/dtos/message.dto';

@Controller('message')
@ApiTags('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.messageService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('group/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findMessagesByGroupId(@Param('id') id: string) {
    try {
      const result = await this.messageService.findAllByGroupId(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('model/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async findMessagesByModelId(@Param('id') id: string) {
    try {
      const result = await this.messageService.findAllByModelId(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addMessage(@Body(new ValidationPipe()) message: MessageDto) {
    try {
      const result = await this.messageService.create(message);
      await this.messageService.addMessageToGroup(message.group_id, result.id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getMessageById(@Param('id') id: number): Promise<Message> {
    try {
      const result = await this.messageService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateMessage(
    @Param('id') id: number,
    @Body() updateMessageDto: MessageDto,
  ): Promise<Message> {
    try {
      const result = await this.messageService.update(id, updateMessageDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: number): Promise<Message> {
    try {
      const result = await this.messageService.delete(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
