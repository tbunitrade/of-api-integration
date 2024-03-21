// model.module.ts

import { Module } from '@nestjs/common';
import { ModelPlatformController } from './model_platform.controller';
import { ModelPlatformService } from './model_platform.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelPlatform } from './model_platform.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ModelPlatform])], // Assuming you're using TypeORM and have a User
  controllers: [ModelPlatformController],
  providers: [ModelPlatformService, JwtAuthGuard],
  exports: [ModelPlatformService], // Export the service if needed in other modules
})
export class ModelPlatformModule {}
