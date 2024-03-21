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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupMessage } from './group_message.entity';
import { GroupMessageService } from './group_message.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GroupMessageDto } from 'src/dtos/group_message.dto';

@Controller('group_message')
@ApiTags('group_message')
export class GroupMessageController {
  constructor(private readonly groupMessageService: GroupMessageService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.groupMessageService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }
  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addGroup(@Body(new ValidationPipe()) groupMessage: GroupMessageDto) {
    try {
      const result = await this.groupMessageService.create(groupMessage);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getGroupById(@Param('id') id: number): Promise<GroupMessage> {
    try {
      const result = await this.groupMessageService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updateGroup(
    @Param('id') id: number,
    @Body() updateGroupMessageDto: GroupMessageDto,
  ): Promise<GroupMessage> {
    try {
      const result = await this.groupMessageService.update(
        id,
        updateGroupMessageDto,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deleteGroup(@Param('id') id: number): Promise<GroupMessage> {
    try {
      const result = await this.groupMessageService.delete(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
