import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { User } from '../user/user.entity';
import { Model } from '../model/model.entity';
import { Platform } from "../platform/platform.entity";
import { ModelPlatform } from "../modelPlatform/model_platform.entity";
import { Group} from "../group/group.entity";
import { Message } from "../message/message.entity";
import { GroupMessage} from "../groupMessages/group_message.entity";
import { PlatformGroup} from "../platformGroup/platform_group.entity";
import { PostFile } from "../postFile/post_file.entity";
import { PostCaption} from "../postCaption/post_caption.entity";
import { Post } from "../post/post.entity";
import { PostTime } from "../postTime/post_time.entity";
import { ModelStatusLogEntity } from "../automate/entities/model-status-log.entity";
import { ModelDailyLimitEntity } from "../automate/entities/model-daily-limit.entity";
import { PostQueueEntity } from "../automate/entities/post-queue.entity";


@Module({
  imports: [
    TypeOrmModule.forFeature([
    User,
    Model,
    Platform,
    ModelPlatform,
    Group,
    Message,
    GroupMessage,
    PlatformGroup,
    PostFile,
    PostCaption,
    Post,
    PostTime,
    ModelStatusLogEntity,
    ModelDailyLimitEntity,
    PostQueueEntity
    ])],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
