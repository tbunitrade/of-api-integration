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
import { PostService } from 'src/post/post.service';
import { PostFileService } from 'src/postFile/post_file.service';
import { PostFile } from 'src/postFile/post_file.entity';
import { PostCaption } from 'src/postCaption/post_caption.entity';
import { PostTimeService } from 'src/postTime/post_time.service';
import { PostTime } from 'src/postTime/post_time.entity';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/user.entity';
import {AutomateModule} from "../automate/automate.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ModelPlatform,
      Group,
      Post,
      PostTime,
      PostFile,
      PostCaption,
      PlatformGroup,
      Post,
    ]),
    AutomateModule
  ],
  controllers: [CronController],
  providers: [
    UserService,
    CronService,
    ModelPlatformService,
    GroupService,
    PostService,
    PostFileService,
    PostTimeService,
    AutomateService,
    SchedulerRegistry,
  ],
  exports: [CronService],
})
export class CronModule {}
