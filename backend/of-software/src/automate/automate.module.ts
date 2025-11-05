import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomateController } from './automate.controller';
import { TestController } from './test-dto.controller';
import { AutomateService } from './automate.service';
import { Module } from '@nestjs/common';
import { ModelStatusLogEntity} from "./entities/model-status-log.entity";
import { ModelDailyLimitEntity} from "./entities/model-daily-limit.entity";
import { ModelLimitService} from "./utils/model-limit.service";
import {AutomateLoggerService} from "./utils/automate-logger.service";

@Module({
  imports: [TypeOrmModule.forFeature([
    ModelStatusLogEntity,
    ModelDailyLimitEntity
  ])], // Assuming you're using TypeORM and have a User
  controllers: [AutomateController, TestController],
  providers: [AutomateService, AutomateLoggerService, ModelLimitService],
  exports: [AutomateService], // Export the service if needed in other modules
})
export class AutomateModule {}
