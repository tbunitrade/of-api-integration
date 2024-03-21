// src/platform_group/platform_group.controller.ts

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
import { PlatformGroup } from './platform_group.entity';
import { PlatformGroupService } from './platform_group.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformGroupDto } from 'src/dtos/platform_group.dto';

@Controller('platform_group')
@ApiTags('platform_group')
export class PlatformGroupController {
  constructor(private readonly platformGroupService: PlatformGroupService) {}

  private makeGroupByPlatformId = (result) => {
    const results = Array.isArray(result) ? result : [result];
    const groupedByPlatformId = results.reduce((_rst, item) => {
      const platform_id = item.platform_id;
      if (!_rst[platform_id]) {
        _rst[platform_id] = {
          id: item.id,
          platform_id: platform_id,
          groups: [],
          platform: item.platform,
        };
      }
      _rst[platform_id].groups.push(item.group);
      return _rst;
    }, {});
    const _result = Object.keys(groupedByPlatformId).map((k) => {
      return groupedByPlatformId[k];
    });
    return _result;
  };

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.platformGroupService.findAll();
      const _result = this.makeGroupByPlatformId(result);
      return _result;
    } catch (error) {
      throw error;
    }
  }
  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addPlatformGroup(
    @Body(new ValidationPipe()) platformGroup: PlatformGroupDto,
  ) {
    try {
      const result = await this.platformGroupService.create(platformGroup);
      const _result = this.makeGroupByPlatformId(result);
      return _result[0];
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPlatformById(@Param('id') id: number): Promise<PlatformGroup> {
    try {
      const result = await this.platformGroupService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('platform/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getGroupByPlatformId(@Param('id') id: number) {
    try {
      const result = await this.platformGroupService.findByPlatformlId(id);
      const _result = this.makeGroupByPlatformId(result);
      return _result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updatePlatform(
    @Param('id') id: number,
    @Body() updatePlatformGroupDto: PlatformGroupDto,
  ): Promise<PlatformGroup> {
    try {
      const result = await this.platformGroupService.update(
        id,
        updatePlatformGroupDto,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deletePlatform(@Param('id') id: number): Promise<PlatformGroup> {
    try {
      const result = await this.platformGroupService.deletePlatform(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
