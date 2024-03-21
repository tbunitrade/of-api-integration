// src/platform/platform.entity.ts

import { ApiProperty } from '@nestjs/swagger';

export class PlatformDto {
  @ApiProperty({
    type: 'string',
    required: true,
  })
  name: string;
}
