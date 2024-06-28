import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { Group } from 'src/group/group.entity';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';
import { GroupService } from 'src/group/group.service';
import { AutomateService } from 'src/automate/automate.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PlatformGroup } from 'src/platformGroup/platform_group.entity';
import { Post } from 'src/post/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModelPlatform, Group, PlatformGroup, Post]),
  ],
  controllers: [CronController],
  providers: [
    CronService,
    ModelPlatformService,
    GroupService,
    AutomateService,
    SchedulerRegistry,
  ],
  exports: [CronService],
})
export class CronModule {}
