// src/dtos/manual-start.dto.ts

import { ApiProperty } from '@nestjs/swagger';
//import { IsNumber } from 'class-validator';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualStartDto {
  @ApiProperty({
    description: 'Is Post',
    //type: 'number',
    type: 'boolean',
    required: true,
  })
  isPost: boolean;

  @ApiProperty({
    description: 'Wait for manual login (keep browser open)',
    type: 'boolean',
    required: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  waitForManualLogin?:boolean;
}
