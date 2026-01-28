import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerOfApiEntity } from './schedulerofapi.entity';
import { SchedulerOfApiService } from './schedulerofapi.service';
import { SchedulerOfApiController } from './schedulerofapi.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchedulerOfApiEntity])],
  providers: [SchedulerOfApiService],
  controllers: [SchedulerOfApiController],
  exports: [SchedulerOfApiService],
})
export class SchedulerOfApiModule {}
