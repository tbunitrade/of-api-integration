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
  Query,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Platform } from './platform.entity';
import { PlatformService } from './platform.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformDto } from 'src/dtos/platform.dto';

@Controller('platform')
@ApiTags('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.platformService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }
  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addPlatform(
    @Body(new ValidationPipe()) platform: PlatformDto,
  ): Promise<Platform> {
    try {
      return await this.platformService.create(platform);
    } catch (error) {
      throw error;
    }
  }
  @Get('search')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async searchPlatforms(@Query('query') query: string): Promise<Platform[]> {
    try {
      const searchResults = await this.platformService.searchPlatforms(query);

      return searchResults;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPlatformById(@Param('id') id: number): Promise<Platform> {
    try {
      const result = await this.platformService.findById(id);
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
    @Body() updatePlatformDto: PlatformDto,
  ): Promise<Platform> {
    try {
      const result = await this.platformService.update(id, updatePlatformDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deletePlatform(@Param('id') id: number): Promise<Platform> {
    try {
      const result = await this.platformService.deletePlatform(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
