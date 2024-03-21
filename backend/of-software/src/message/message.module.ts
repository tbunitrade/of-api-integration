// model.module.ts

import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GroupMessage } from 'src/groupMessages/group_message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, GroupMessage])], // Assuming you're using TypeORM and have a User
  controllers: [MessageController],
  providers: [MessageService, JwtAuthGuard],
  exports: [MessageService], // Export the service if needed in other modules
})
export class MessageModule {}
