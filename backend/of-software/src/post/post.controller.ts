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
import { PostService } from './post.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostDto } from 'src/dtos/post.dto';
import { Post as OFPost } from './post.entity';

@Controller('post')
@ApiTags('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.postService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPost(@Param('id') id: string) {
    try {
      const result =
        await this.postService.getPostTimesAndCaptionsForModelPlatform(+id);
      return result;
    } catch (err) {
      throw err;
    }
  }

  @Get(':id/post-times')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPostTimes(@Param('id') id: string) {
    try {
      const result =
        await this.postService.getPostTimesAndCaptionsForModelPlatform(+id);
      if (result) {
        return result.post_times ?? [];
      }
      return [];
    } catch (err) {
      throw err;
    }
  }

  @Get(':id/post-captions')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPostCaptions(@Param('id') id: string) {
    try {
      const result =
        await this.postService.getPostTimesAndCaptionsForModelPlatform(+id);
      if (result) {
        return result.captions ?? [];
      }
      return [];
    } catch (err) {
      throw err;
    }
  }

  @Get('model/:model_id/platform/:platform_id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPostByModelAndPlatformId(
    @Param('model_id') model_id: number,
    @Param('platform_id') platform_id: number,
  ) {
    try {
      const result = await this.postService.findByModelIdAndPlatformId(
        model_id,
        platform_id,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addPost(@Body(new ValidationPipe()) post: PostDto) {
    try {
      const result = await this.postService.create(post);
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
    @Body() updatePostDto: PostDto,
  ): Promise<OFPost> {
    try {
      const result = await this.postService.update(id, updatePostDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') id: number): Promise<OFPost> {
    try {
      const result = await this.postService.deletePost(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
