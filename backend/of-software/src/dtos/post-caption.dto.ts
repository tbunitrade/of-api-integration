// src/dtos/post-caption.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class PostCaptionDto {
  @ApiProperty({
    type: 'number',
    required: true,
  })
  post_time_id: number;

  @ApiProperty({
    type: 'string',
  })
  caption: string;

  @ApiProperty({
    type: 'number',
    required: false,
  })
  status: number;
}
