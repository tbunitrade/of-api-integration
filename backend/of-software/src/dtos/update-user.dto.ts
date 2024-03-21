// update-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  email?: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  password?: string;

  @ApiProperty({
    type: 'string',
  })
  @IsOptional()
  photo?: string;
}
