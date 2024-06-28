// post_time.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostCaption } from './post_caption.entity';
import { PostCaptionController } from './post_caption.controller';
import { PostCaptionService } from './post_caption.service';

@Module({
  imports: [TypeOrmModule.forFeature([PostCaption])], // Assuming you're using TypeORM and have a User
  controllers: [PostCaptionController],
  providers: [PostCaptionService, JwtAuthGuard],
  exports: [PostCaptionService], // Export the service if needed in other modules
})
export class PostCaptionModule {}
