// model.module.ts

import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PlatformGroup } from 'src/platformGroup/platform_group.entity';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { Post } from 'src/post/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, PlatformGroup, ModelPlatform, Post]),
  ], // Assuming you're using TypeORM and have a User
  controllers: [GroupController],
  providers: [GroupService, JwtAuthGuard, ModelPlatformService],
  exports: [GroupService], // Export the service if needed in other modules
})
export class GroupModule {}
