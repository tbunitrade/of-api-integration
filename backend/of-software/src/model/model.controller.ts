// src/model/model.controller.ts

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
import { Model } from './model.entity';
import { ModelService } from './model.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ModelDto } from 'src/dtos/model.dto';

@Controller('model')
@ApiTags('model')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.modelService.findAll();
      console.log('Model controller all', result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('all-with-platform')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAllWithPlatform() {
    try {
      const result = await this.modelService.findModelWithPlatform();
      console.log('Model controller all-with-platform', result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addModel(@Body(new ValidationPipe()) model: ModelDto): Promise<Model> {
    try {
      console.log('Model controller addModel')
      return await this.modelService.create(model);
    } catch (error) {
      throw error;
    }
  }
  @Get('search')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async searchModels(@Query('query') query: string): Promise<Model[]> {
    try {
      const searchResults = await this.modelService.searcModels(query);

      return searchResults;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getModelById(@Param('id') id: number): Promise<Model> {
    try {
      const result = await this.modelService.findById(id);
      console.log('Model controller getModelById', result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updateModel(
    @Param('id') id: number,
    @Body() updateModelDto: ModelDto,
  ): Promise<Model> {
    try {
      const result = await this.modelService.update(id, updateModelDto);
      console.log('Model controller updateModel', result);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deleteModel(@Param('id') id: number): Promise<Model> {
    try {
      const result = await this.modelService.deleteModel(id);
      console.log('Model controller deleteModel', result); // <- тут уже пустой объект
      console.log('🟡 Удаление модели завершено, ID был:', id);
      console.log(`✅ Модель удалена. ID: ${id}`);
      console.log('✅ Model удалён:', {
        id,
        name: result?.name,
      });
      return result;
    } catch (error) {
      throw error;
    }
  }
}
