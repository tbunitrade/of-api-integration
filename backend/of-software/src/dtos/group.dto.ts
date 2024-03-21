// src/dtos/group.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Timestamp } from 'typeorm';

export class GroupDto {
  @ApiProperty({
    type: 'string',
    required: true,
  })
  name: string;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  model_id: number;

  @ApiProperty({
    type: 'number',
    required: false,
  })
  platform_id: number;

  @ApiProperty({
    type: Timestamp,
  })
  added_on_platform_at: Date;

  @ApiProperty({
    type: 'number',
  })
  status: number;
}
