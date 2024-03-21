import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomateController } from './automate.controller';
import { AutomateService } from './automate.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [TypeOrmModule.forFeature()], // Assuming you're using TypeORM and have a User
  controllers: [AutomateController],
  providers: [AutomateService],
  exports: [AutomateService], // Export the service if needed in other modules
})
export class AutomateModule {}
