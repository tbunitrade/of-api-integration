// model.module.ts

import { Module } from '@nestjs/common';
import { ModelController } from './model.controller';
import { ModelService } from './model.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Model } from './model.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Model])], // Assuming you're using TypeORM and have a User
  controllers: [ModelController],
  providers: [ModelService, JwtAuthGuard],
  exports: [ModelService], // Export the service if needed in other modules
})
export class ModelModule {}
