// src/model/model.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class ModelDto {
  @ApiProperty({
    type: 'string',
    required: true,
  })
  name: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  photo: string;
}
