// platform_group.module.ts

import { Module } from '@nestjs/common';
import { PlatformGroupController } from './platform_group.controller';
import { PlatformGroupService } from './platform_group.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformGroup } from './platform_group.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformGroup])], // Assuming you're using TypeORM and have a User
  controllers: [PlatformGroupController],
  providers: [PlatformGroupService, JwtAuthGuard],
  exports: [PlatformGroupService], // Export the service if needed in other modules
})
export class PlatformGroupModule {}
