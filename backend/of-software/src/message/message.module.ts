// model.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Message } from './message.entity';
import { GroupMessage } from 'src/groupMessages/group_message.entity';
import { Group } from "../group/group.entity";
import { MessageService } from './message.service';
import { MessageController } from './message.controller';


@Module({
  imports: [TypeOrmModule.forFeature([Message, GroupMessage, Group])], // Assuming you're using TypeORM and have a User
  controllers: [MessageController],
  providers: [MessageService, JwtAuthGuard],
  exports: [MessageService], // Export the service if needed in other modules
})
export class MessageModule {}
