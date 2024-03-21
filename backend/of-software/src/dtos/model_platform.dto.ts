// src/dtos/model_platform.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ModelPlatformDto {
  @ApiProperty({
    type: 'number',
    required: true,
  })
  model_id: number;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  platform_id: number;

  @ApiProperty({
    type: 'string',
    required: true,
  })
  username: string;

  @ApiProperty({
    type: 'string',
    required: true,
  })
  password: string;

  @ApiProperty({
    type: 'string',
  })
  site_url: string;

  @ApiProperty({
    type: 'string',
    default: 1,
  })
  number_of_days: number;

  @ApiProperty({
    type: 'string',
  })
  scheduled_date: string;

  // This is for cron job.
  @ApiProperty({
    type: 'number',
  })
  latest_group_id: number;
}
