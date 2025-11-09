// src/user/user.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UserDto {
  @ApiProperty({
    type: 'string',
    required: true,
  })
  email: string;

  @ApiProperty({
    type: 'string',
    required: true,
  })
  password: string;

  @ApiProperty({
    type: 'string',
    required: false,
  })
  fingerprint_username?: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  firstName: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  lastName: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  photo: string;
}
