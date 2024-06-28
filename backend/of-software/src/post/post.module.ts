// post.module.ts

import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, ModelPlatform])], // Assuming you're using TypeORM and have a User
  controllers: [PostController],
  providers: [PostService, JwtAuthGuard],
  exports: [PostService], // Export the service if needed in other modules
})
export class PostModule {}
