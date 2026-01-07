// src/dtos/send-mass-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMassMessageDto {
  @ApiProperty({ type: 'number', required: true, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  modelPlatformId: number;

  @ApiProperty({ type: 'string', required: true })
  @IsString()
  text: string;

  @ApiProperty({ type: [String], required: false, description: 'List tokens: fans/following/tagged or custom list id as string/number' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  userLists?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  excludedLists?: string[];

  @ApiProperty({ type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  userIds?: number[];
}
