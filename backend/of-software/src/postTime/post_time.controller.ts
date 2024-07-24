import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostTimeService } from './post_time.service';
import { PostTimeDto } from 'src/dtos/post-time.dto';
import { PostTime } from './post_time.entity';

@Controller('post_time')
@ApiTags('post_time')
export class PostTimeController {
  constructor(private readonly postTimeService: PostTimeService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.postTimeService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPostTimeById(@Param('id') id: number): Promise<PostTime> {
    try {
      const result = await this.postTimeService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addPostTime(@Body(new ValidationPipe()) postTime: PostTimeDto) {
    try {
      const result = await this.postTimeService.create(postTime);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updatePostTime(
    @Param('id') id: number,
    @Body() updatePostTimeDto: PostTimeDto,
  ): Promise<PostTime> {
    try {
      const result = await this.postTimeService.update(id, updatePostTimeDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deletePostTime(@Param('id') id: number): Promise<PostTime> {
    try {
      const result = await this.postTimeService.deletePostTime(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
