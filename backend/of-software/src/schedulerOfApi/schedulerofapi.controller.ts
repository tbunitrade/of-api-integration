// backend/of-software/src/schedulerOfApi/schedulerofapi.controller.ts

import { Controller, Get, Param, Req, Post, Body, Patch, Query } from '@nestjs/common';
import type { Request } from 'express';
import { SchedulerOfApiService } from './schedulerofapi.service';
import { CreateSchedulerOfApiDto } from '../dtos/create-schedulerofapi.dto';
import { UpdateSchedulerOfApiDto } from '../dtos/update-schedulerofapi.dto';

@Controller('schedulerofapi')
export class SchedulerOfApiController {
  constructor(private readonly service: SchedulerOfApiService) {}

  @Get()
  findAll(@Req() req: Request, @Query()  query: any) {
    console.log('[schedulerofapi] GET url=', req.originalUrl, 'query=', query);
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(Number(id));
  }

  @Post()
  create(@Body() dto: CreateSchedulerOfApiDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSchedulerOfApiDto) {
    return this.service.update(Number(id), dto);
  }

  @Post(':id/sync')
  sync(@Param('id') id: string) {
    return this.service.sync(Number(id));
  }
}
