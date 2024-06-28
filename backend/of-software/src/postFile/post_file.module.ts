// post_file.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostFile } from './post_file.entity';
import { PostFileController } from './post_file.controller';
import { PostFileService } from './post_file.service';

@Module({
  imports: [TypeOrmModule.forFeature([PostFile])], // Assuming you're using TypeORM and have a User
  controllers: [PostFileController],
  providers: [PostFileService, JwtAuthGuard],
  exports: [PostFileService], // Export the service if needed in other modules
})
export class PostFileModule {}
