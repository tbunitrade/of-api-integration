// src/app.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller'; // ✅ Добавлено
import { AppService } from './app.service'; // ✅ Добавлено

import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ModelModule } from './model/model.module';
import { PlatformModule } from './platform/platform.module';
import { ModelPlatformModule } from './modelPlatform/model_platform.module';
import { GroupModule } from './group/group.module';
import { MessageModule } from './message/message.module';
import { GroupMessageModule } from './groupMessages/group_message.module';
import { FileUploadModule } from './upload/upload.module';
import { PlatformGroupModule } from './platformGroup/platform_group.module';
import { AutomateModule } from './automate/automate.module';
import { CronModule } from './cron/cron.module';
import { PostModule } from './post/post.module';
import { PostTimeModule } from './postTime/post_time.module';
import { PostCaptionModule } from './postCaption/post_caption.module';
import { PostFileModule } from './postFile/post_file.module';

import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: configService.get('DB_TYPE') as 'postgres',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT')),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('DB_NAME') as string,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('ENV') === 'development',
      }),
    }),
    ConfigModule.forRoot(),
    DatabaseModule,
    UserModule,
    AuthModule,
    ModelModule,
    PlatformModule,
    ModelPlatformModule,
    GroupModule,
    MessageModule,
    GroupMessageModule,
    FileUploadModule,
    PlatformGroupModule,
    AutomateModule,
    CronModule,
    PostModule,
    PostTimeModule,
    PostCaptionModule,
    PostFileModule,
  ],
  controllers: [AppController], // ✅ Добавлено
  providers: [AppService], // ✅ Добавлено
})
export class AppModule {}
