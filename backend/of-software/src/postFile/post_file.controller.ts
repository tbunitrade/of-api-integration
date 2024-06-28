import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostFileService } from './post_file.service';
import { PostFile } from './post_file.entity';
import { PostFileDto } from 'src/dtos/post-file.dto';

@Controller('post_file')
@ApiTags('post_file')
export class PostFileController {
  constructor(private readonly postFileService: PostFileService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.postFileService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPostFileById(@Param('id') id: number): Promise<PostFile> {
    try {
      const result = await this.postFileService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('post/:post_id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPostFilesByPostId(@Param('post_id') post_id: number) {
    try {
      const result = await this.postFileService.findByPostId(post_id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addPostFile(@Body(new ValidationPipe()) postFile: PostFileDto) {
    try {
      const result = await this.postFileService.create(postFile);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deletePostFile(@Param('id') id: number): Promise<PostFile> {
    try {
      const result = await this.postFileService.deletePostFile(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
