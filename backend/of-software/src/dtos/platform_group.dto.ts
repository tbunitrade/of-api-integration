// src/dtos/platform_group.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class PlatformGroupDto {
  @ApiProperty({
    type: 'number',
    required: true,
  })
  platform_id: number;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  group_id: number;

  @ApiProperty({
    type: 'number',
    required: false,
  })
  status: number;
}
