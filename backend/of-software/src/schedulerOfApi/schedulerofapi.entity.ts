// backend/of-software/src/schedulerOfApi/schedulerofapi.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SchedulerOfApiJobType = 'massmsg' | 'post' | 'sync' | 'other';
export type SchedulerOfApiStatus =
  | 'queued'
  | 'scheduled'
  | 'sent'
  | 'done'
  | 'failed'
  | 'canceled';

@Entity({ name: 'schedulerofapi', schema: 'public' })
@Index('idx_schedulerofapi_mp', ['model_platform_id'])
@Index('idx_schedulerofapi_group', ['group_id'])
@Index('idx_schedulerofapi_message', ['message_id'])
@Index('idx_schedulerofapi_external', ['external_id'])
@Index('idx_schedulerofapi_status', ['status'])
@Index('idx_schedulerofapi_scheduled_at', ['scheduled_at'])
export class SchedulerOfApiEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  model_platform_id: number;

  @Column({ type: 'integer', nullable: true })
  group_id: number | null;

  @Column({ type: 'integer', nullable: true })
  message_id: number | null;

  @Column({ type: 'varchar', default: 'massmsg' })
  job_type: SchedulerOfApiJobType;

  @Column({ type: 'varchar', default: 'queued' })
  status: SchedulerOfApiStatus;

  @Column({ type: 'integer', default: 0 })
  attempt: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'bigint', nullable: true })
  external_id: string | null; // bigint in pg => лучше string в JS

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @Column({ type: 'jsonb', nullable: true })
  provider_response: any;

  // denorm fields
  @Column({ type: 'timestamptz', nullable: true })
  provider_date: Date | null;

  @Column({ type: 'boolean', nullable: true })
  provider_is_ready: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  provider_is_done: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  provider_has_error: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  provider_is_canceled: boolean | null;

  @Column({ type: 'integer', nullable: true })
  provider_pending: number | null;

  @Column({ type: 'integer', nullable: true })
  provider_total: number | null;

  @Column({ type: 'boolean', nullable: true })
  provider_can_unsend: boolean | null;

  @Column({ type: 'integer', nullable: true })
  provider_unsend_seconds: number | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at: Date;
}
