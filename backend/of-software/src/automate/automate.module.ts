import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AutomateController } from './automate.controller';
import { TestController } from './test-dto.controller';

import { AutomateService } from './automate.service';

import { ModelStatusLogEntity } from './entities/model-status-log.entity';
import { ModelDailyLimitEntity } from './entities/model-daily-limit.entity';
import { PostQueueEntity} from "./entities/post-queue.entity";

import { ModelLimitService } from './utils/model-limit.service';
import { AutomateLoggerService } from './utils/automate-logger.service';
import { PostQueueService } from './utils/post-queue.service';

// NEW SERVICES — MUST BE REGISTERED
import { SafariPostService } from './safari-post.service';
import { SafariMessageService } from './safari-message.service';
import { PuppeteerPostService } from './puppeteer-post.service';
import { PuppeteerMessageService } from './puppeteer-message.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModelStatusLogEntity,
      ModelDailyLimitEntity,
      PostQueueEntity,
    ])
  ],

  controllers: [
    AutomateController,
    TestController
  ],

  providers: [
    AutomateService,

    // Logging + limits
    AutomateLoggerService,
    ModelLimitService,

    // Queue
    PostQueueService,

    // NEW SERVICES — REQUIRED BY AutomateService
    SafariPostService,
    SafariMessageService,
    PuppeteerPostService,
    PuppeteerMessageService,
  ],

  exports: [
    AutomateService,
    AutomateLoggerService,
    ModelLimitService,
    PostQueueService,

    SafariPostService,
    SafariMessageService,
    PuppeteerPostService,
    PuppeteerMessageService,
  ]
})
export class AutomateModule {}
