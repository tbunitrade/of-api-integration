// backend/of-software/src/dtos/message.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MessageDto {
  @ApiProperty({ type: 'string', required: true })
  @IsString()
  name: string;

  @ApiProperty({ type: 'number', required: true })
  @IsNumber()
  group_id: number;

  @ApiPropertyOptional({ type: 'string', format: 'time', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    const v = String(value ?? '').trim();
    return v === '' ? undefined : v; // ВАЖНО: undefined, не null
  })
  message_time?: string;

  @ApiPropertyOptional({ type: 'number', format: 'float', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? 0 : value))
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ type: 'string', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    const v = String(value ?? '').trim();
    return v === '' ? undefined : v; // ВАЖНО: undefined, не null
  })
  message_list?: string;

  @ApiPropertyOptional({ type: 'string', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ type: 'string', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: 'string', required: false })
  @IsOptional()
  @IsString()
  message_exclude_list?: string;

  @ApiPropertyOptional({ type: 'boolean', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  content_attached?: boolean;

  @ApiPropertyOptional({ type: 'string', required: false })
  @IsOptional()
  @IsString()
  release_form_tags?: string;

  @ApiPropertyOptional({ type: 'string', required: false })
  @IsOptional()
  @IsString()
  release_user_tags?: string;

  @ApiPropertyOptional({ type: 'number', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value == null) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  })
  @IsNumber()
  free_preview?: number;

  @ApiPropertyOptional({ type: 'number', required: false })
  @IsOptional()
  @IsNumber()
  status?: number;

  // ===== mass message template fields =====

  @ApiPropertyOptional({ type: 'boolean', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  massmsg?: boolean;

  @ApiPropertyOptional({ type: 'array', items: { type: 'string' }, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audience_include_ids?: string[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'string' }, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  audience_exclude_ids?: string[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'string' }, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user_ids_array?: string[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'string' }, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vault_media_ids?: string[];

  @ApiPropertyOptional({ type: 'string', format: 'date-time', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduled_date?: Date; // <-- ВАЖНО: Date, не string
}
