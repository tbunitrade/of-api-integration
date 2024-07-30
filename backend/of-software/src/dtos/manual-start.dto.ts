// src/dtos/manual-start.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ManualStartDto {
  @ApiProperty({
    description: 'Is Post',
    type: 'number',
    required: true,
  })
  @IsNumber()
  isPost: boolean;
}
