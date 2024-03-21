// src/dtos/create-cron.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCronDto {
  @ApiProperty({
    description: 'Cron Job Name',
    type: 'string',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Cron Job Interval',
    type: 'string',
    required: true,
  })
  @IsString()
  interval: string;
}
