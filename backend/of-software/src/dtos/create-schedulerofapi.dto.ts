// backend/of-software/src/dtos/create-schedulerofapi.dto.ts
import { IsInt, IsOptional, IsString, IsIn, IsObject } from 'class-validator';

export class CreateSchedulerOfApiDto {
  @IsInt()
  model_platform_id: number;

  @IsOptional()
  @IsInt()
  group_id?: number | null;

  @IsOptional()
  @IsInt()
  message_id?: number | null;

  @IsOptional()
  @IsString()
  @IsIn(['massmsg', 'post', 'sync', 'other'])
  job_type?: 'massmsg' | 'post' | 'sync' | 'other';

  @IsOptional()
  @IsString()
  @IsIn(['queued', 'scheduled', 'sent', 'done', 'failed', 'canceled'])
  status?: 'queued' | 'scheduled' | 'sent' | 'done' | 'failed' | 'canceled';

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsString()
  scheduled_at?: string | null; // ISO string
}
