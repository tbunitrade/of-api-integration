// model.module.ts

import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from './platform.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Platform])], // Assuming you're using TypeORM and have a User
  controllers: [PlatformController],
  providers: [PlatformService, JwtAuthGuard],
  exports: [PlatformService], // Export the service if needed in other modules
})
export class PlatformModule {}
