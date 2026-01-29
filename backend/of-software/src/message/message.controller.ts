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
  Query, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Message } from './message.entity';
import { MessageService } from './message.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessageDto } from 'src/dtos/message.dto';
import { SearchRequestDto } from 'src/dtos/search-request.dto';

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
      console.log('[MESSAGE findAll] res=', result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('group/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findMessagesByGroupId(
    @Param('id') id: string,
    @Query('massmsg') massmsg?: string,
    @Query('model_platform_id') model_platform_id?: string,) {
    const massFlag =
      massmsg === undefined || massmsg === null || massmsg === ''
        ? undefined
        : (String(massmsg).toLowerCase() === 'true' || String(massmsg) === '1');
    const mpId = model_platform_id ? Number(model_platform_id) : undefined;

    try {
      console.log('[MESSAGE findMessagesByGroupId] id=', id);
      return this.messageService.findAllByGroupId(id, massFlag, mpId);
    } catch (error) {
         throw error;
    }
  }

  @Get('model/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async findMessagesByModelId(
    @Param('id') id: string,
    @Query() searchRequestDto: SearchRequestDto,
    @Query('massmsg') massmsg?: string,
    @Query('model_platform_id') model_platform_id?: string,
  ) {
    const massFlag =
      massmsg === undefined || massmsg === null || massmsg === ''
        ? undefined
        : (String(massmsg).toLowerCase() === 'true' || String(massmsg) === '1');
    const mpId = model_platform_id ? Number(model_platform_id) : undefined;

    try {
      console.log('[MESSAGE findMessagesByModelId] id=', id);
      return this.messageService.findAllByModelId(id, searchRequestDto.searchStr, massFlag, mpId);
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async addMessage(@Body() message: MessageDto) {
    try {
      const { group_id, ...payload } = message as any;

      if (payload?.id) {
        throw new BadRequestException('Use PATCH /message/:id for update');
      }

      const result = await this.messageService.create(payload);
      await this.messageService.addMessageToGroup(group_id, result.id);

      console.log('[MESSAGE ADD group_id=', message?.group_id, 'payload.id=', (message as any)?.id);
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
      console.log('[MESSAGE getMessageById] id=', id);
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
      // group_id не часть entity Message — выкидываем перед update
      const { group_id, ...update } = updateMessageDto as any;

      // update уже чисто под Message (Partial<Message>)
      const result = await this.messageService.update(id, update);

      // если фронт прислал group_id — обеспечим связь (без дублей)
      if (group_id) {
        //await this.messageService.addMessageToGroup(Number(group_id), result.id);
        await this.messageService.moveMessageToGroup(result.id, Number(group_id));
      }
      console.log('[MESSAGE PATCH] id=', id, 'dto.id=', (updateMessageDto as any)?.id, 'group_id=', (updateMessageDto as any)?.group_id);
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
      console.log('[MESSAGE DELETED] id=', id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
