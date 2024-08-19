// src/dtos/post.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class PostDto {
  @ApiProperty({
    type: 'number',
  })
  id?: number;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  model_platform_id: number;

  @ApiProperty({
    type: 'string',
    required: false,
  })
  form_tags?: string;

  @ApiProperty({
    type: 'string',
    required: false,
  })
  user_tags?: string;

  @ApiProperty({
    type: 'number',
    required: false,
  })
  number_of_days?: number;

  @ApiProperty({
    type: 'number',
    required: false,
  })
  status?: number;
}
