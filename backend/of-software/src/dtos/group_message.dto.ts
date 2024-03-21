// src/dtos/group_message.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class GroupMessageDto {
  @ApiProperty({
    type: 'number',
    required: true,
  })
  group_id: number;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  message_id: number;

  @ApiProperty({
    type: 'number',
  })
  status: number;
}
