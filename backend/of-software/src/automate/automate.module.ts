import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AutomateController } from './automate.controller';
import { TestController } from './test-dto.controller';

import { AutomateService } from './automate.service';

import { ModelStatusLogEntity } from './entities/model-status-log.entity';
import { ModelDailyLimitEntity } from './entities/model-daily-limit.entity';

import { ModelLimitService } from './utils/model-limit.service';
import { AutomateLoggerService } from './utils/automate-logger.service';

// NEW SERVICES — MUST BE REGISTERED
import { SafariPostService } from './safari-post.service';
import { SafariMessageService } from './safari-message.service';
import { PuppeteerPostService } from './puppeteer-post.service';
import { PuppeteerMessageService } from './puppeteer-message.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModelStatusLogEntity,
      ModelDailyLimitEntity
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

    SafariPostService,
    SafariMessageService,
    PuppeteerPostService,
    PuppeteerMessageService,
  ]
})
export class AutomateModule {}
