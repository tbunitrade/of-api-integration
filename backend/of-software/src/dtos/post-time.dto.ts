// src/dtos/post-time.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class PostTimeDto {
  @ApiProperty({
    type: 'number',
    required: true,
  })
  post_id: number;

  @ApiProperty({
    type: 'string',
    format: 'time',
  })
  time: string;

  @ApiProperty({
    type: 'number',
    required: false,
  })
  status: number;
}
