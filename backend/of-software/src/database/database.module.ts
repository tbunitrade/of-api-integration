import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
