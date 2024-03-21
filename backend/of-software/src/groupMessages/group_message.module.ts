// groupMessage.module.ts

import { Module } from '@nestjs/common';
import { GroupMessageController } from './group_message.controller';
import { GroupMessageService } from './group_message.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMessage } from './group_message.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([GroupMessage])], // Assuming you're using TypeORM and have a User
  controllers: [GroupMessageController],
  providers: [GroupMessageService, JwtAuthGuard],
  exports: [GroupMessageService], // Export the service if needed in other modules
})
export class GroupMessageModule {}
