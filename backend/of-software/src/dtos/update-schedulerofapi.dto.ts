// backend/of-software/src/dtos/update-schedulerofapi.dto.ts
import { IsOptional, IsString, IsInt, IsIn, IsObject } from 'class-validator';

export class UpdateSchedulerOfApiDto {
  @IsOptional()
  @IsString()
  @IsIn(['queued', 'scheduled', 'sent', 'done', 'failed', 'canceled'])
  status?: 'queued' | 'scheduled' | 'sent' | 'done' | 'failed' | 'canceled';

  @IsOptional()
  @IsInt()
  attempt?: number;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string | null; // ISO

  @IsOptional()
  @IsString()
  external_id?: string | null;

  @IsOptional()
  @IsObject()
  payload?: any;

  // @IsObject() валидирует “plain object”.
  // Если завтра захочу payload как массив (например ids[]),
  // то это может сломаться.
  @IsOptional()
  @IsObject()
  provider_response?: any;
}
