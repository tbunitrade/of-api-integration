// src/dtos/post-file.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class PostFileDto {
  @ApiProperty({
    type: 'number',
    required: true,
  })
  post_id: number;

  @ApiProperty({
    type: 'string',
    format: 'time',
  })
  url: string;

  @ApiProperty({
    type: 'number',
    required: false,
  })
  status: number;
}
