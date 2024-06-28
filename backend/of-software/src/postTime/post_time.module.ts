// post_time.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostTimeController } from './post_time.controller';
import { PostTimeService } from './post_time.service';
import { PostTime } from './post_time.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostTime])], // Assuming you're using TypeORM and have a User
  controllers: [PostTimeController],
  providers: [PostTimeService, JwtAuthGuard],
  exports: [PostTimeService], // Export the service if needed in other modules
})
export class PostTimeModule {}
