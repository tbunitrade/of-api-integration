// user.module.ts

import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Assuming you're using TypeORM and have a User
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard],
  exports: [UserService], // Export the service if needed in other modules
})
export class UserModule {}
