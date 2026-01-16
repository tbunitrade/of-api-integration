import { Module } from '@nestjs/common';
import { FileUploadController } from './upload.controller';
import { FileUploadService } from './upload.service';
import { MessageModule } from 'src/message/message.module';

@Module({
  imports: [
    MessageModule, // <-- важно
  ],
  controllers: [FileUploadController],
  providers: [FileUploadService],
})
export class FileUploadModule {}

// import { Module } from '@nestjs/common';
// import { FileUploadController } from './upload.controller';
// import { FileUploadService } from './upload.service';
// import { MessageService } from 'src/message/message.service';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Message } from 'src/message/message.entity';
// import { GroupMessage } from 'src/groupMessages/group_message.entity';
//
// @Module({
//   imports: [TypeOrmModule.forFeature([Message, GroupMessage])], // Assuming you're using TypeORM and have a User
//   controllers: [FileUploadController],
//   providers: [FileUploadService, MessageService],
// })
// export class FileUploadModule {}
