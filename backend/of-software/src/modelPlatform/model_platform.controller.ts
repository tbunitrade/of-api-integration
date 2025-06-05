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
import { ModelPlatform } from './model_platform.entity';
import { ModelPlatformService } from './model_platform.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModelPlatformDto } from 'src/dtos/model_platform.dto';

@Controller('model_platform')
@ApiTags('model_platform')
export class ModelPlatformController {
  constructor(private readonly modelPlatformService: ModelPlatformService) {}

  private makeGroupByModelId = (result) => {
    if (!result) return [];
    const results = Array.isArray(result) ? result : [result];
    const groupedByModelId = results.reduce((_rst, item) => {
      const modelId = item.model_id;
      if (!_rst[modelId]) {
        _rst[modelId] = {
          model_id: modelId,
          platforms: [],
          model: item.models,
          id: item.id,
        };
      }
      const _platform = {
        ...item.platforms,
        username: item.username,
        password: item.password,
        latest_group_id: item.latest_group_id,
        number_of_days: item.number_of_days,
        scheduled_date: item.scheduled_date,
        site_url: item.site_url,
        model_platform_id: item.id,
      };
      _rst[modelId].platforms.push(_platform);
      return _rst;
    }, {});
    const _result = Object.keys(groupedByModelId).map((k) => {
      return groupedByModelId[k];
    });
    return _result;
  };

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.modelPlatformService.findAll();
      const _result = this.makeGroupByModelId(result);
      return _result;
    } catch (error) {
      throw error;
    }
  }
  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addModelPlatform(
    @Body(new ValidationPipe()) modelPlatform: ModelPlatformDto,
  ) {
    try {
      const result = await this.modelPlatformService.create(modelPlatform);
      const grouped = this.makeGroupByModelId(result);
      return grouped[0];
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPlatformById(@Param('id') id: number): Promise<ModelPlatform> {
    try {
      const result = await this.modelPlatformService.findById(id);
      const _result = this.makeGroupByModelId(result);
      return _result[0];
    } catch (error) {
      throw error;
    }
  }

  // @Get('model/all')
  // @ApiBearerAuth('jwt')
  // @UseGuards(JwtAuthGuard)
  // async getModelWithPlatform() {
  //   try {
  //     const result = await this.modelPlatformService.findModelWithPlatform();
  //     const _result = this.makeGroupByModelId(result);
  //     return _result;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  @Get('model/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPlatformByModelId(@Param('id') id: number) {
    try {
      const result = await this.modelPlatformService.findByModelId(id);
      const _result = this.makeGroupByModelId(result);
      return _result;
    } catch (error) {
      throw error;
    }
  }

  @Get('model/:model_id/platform/:platform_id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPlatformByModelAndPlatformId(
    @Param('model_id') model_id: number,
    @Param('platform_id') platform_id: number,
  ) {
    try {
      const result = await this.modelPlatformService.findByModelAndPlatform(
        model_id,
        platform_id,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updatePlatform(
    @Param('id') id: number,
    @Body() updateModelPlatformDto: ModelPlatformDto,
  ): Promise<ModelPlatform> {
    try {
      const result = await this.modelPlatformService.update(
        id,
        updateModelPlatformDto,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deletePlatform(@Param('id') id: number): Promise<ModelPlatform> {
    try {
      const result = await this.modelPlatformService.deletePlatform(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
