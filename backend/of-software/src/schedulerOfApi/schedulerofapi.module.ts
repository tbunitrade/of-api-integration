import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerOfApiEntity } from './schedulerofapi.entity';
import { SchedulerOfApiService } from './schedulerofapi.service';
import { SchedulerOfApiController } from './schedulerofapi.controller';
import { AutomateModule } from "../automate/automate.module";

@Module({
  imports: [TypeOrmModule.forFeature([SchedulerOfApiEntity]),
    AutomateModule
  ],
  providers: [SchedulerOfApiService],
  controllers: [SchedulerOfApiController],
  exports: [SchedulerOfApiService],
})
export class SchedulerOfApiModule {}
