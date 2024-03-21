// src/dtos/message.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class MessageDto {
  @ApiProperty({
    type: 'string',
    required: true,
  })
  name: string;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  group_id: number;

  @ApiProperty({
    type: 'string',
    format: 'time',
  })
  message_time: string;

  @Transform(({ value }) => (value === '' ? 0 : value))
  @ApiProperty({
    type: 'number',
    format: 'float',
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    type: 'string',
    required: true,
  })
  message_list: string;

  @ApiProperty({
    type: 'string',
    required: false,
  })
  message: string;

  @ApiProperty({
    type: 'string',
    required: false,
  })
  content: string;

  @ApiProperty({
    type: 'string',
    required: false,
  })
  message_exclude_list: string;

  @ApiProperty({
    type: 'boolean',
    default: false,
  })
  content_attached: boolean;

  @ApiProperty({
    type: 'string',
  })
  release_form_tags: string;

  @ApiProperty({
    type: 'string',
  })
  release_user_tags: string;

  @Transform(({ value }) => (value === '' ? 0 : value))
  @ApiProperty({
    type: 'number',
  })
  @IsNumber()
  free_preview: number;

  @ApiProperty({
    type: 'number',
  })
  status: number;
}
