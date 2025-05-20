import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostCaptionService } from './post_caption.service';
import { PostCaptionDto } from 'src/dtos/post-caption.dto';
import { PostCaption } from './post_caption.entity';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('post_caption')
@ApiTags('post_caption')
export class PostCaptionController {
  constructor(private readonly postCaptionService: PostCaptionService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.postCaptionService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('post/:post_id/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('jwt')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024,
      },
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFiles(
    @UploadedFiles() uploaded_files: Express.Multer.File[],
    @Param('post_id') postId: number,
  ): Promise<any> {
    try {
      if (uploaded_files && uploaded_files.length > 0) {
        const result = await this.postCaptionService.uploadFiles(
          uploaded_files[0],
          postId,
        );
        return result;
      }
      return [];
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getPostCaptionById(@Param('id') id: number): Promise<PostCaption> {
    try {
      const result = await this.postCaptionService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addPostCaption(
    @Body(new ValidationPipe()) postCaption: PostCaptionDto,
  ) {
    try {
      const result = await this.postCaptionService.create(postCaption);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updatePostCaption(
    @Param('id') id: number,
    @Body() updatePostCaptionDto: PostCaptionDto,
  ): Promise<PostCaption> {
    try {
      const result = await this.postCaptionService.update(
        id,
        updatePostCaptionDto,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deletePostCaption(@Param('id') id: number): Promise<PostCaption> {
    try {
      const result = await this.postCaptionService.deletePostCaption(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('delete-many')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deleteMany(@Body('ids') ids: number[]) {
    try {
      const result = await this.postCaptionService.deleteMany(ids);
      return { success: true, delete: result };
    } catch (error) {
      console.log('deleteMany Error');
      throw error;
    }
  }
}
