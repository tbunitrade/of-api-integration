// src/model_platform/model_platform.entity.ts

import { Model } from 'src/model/model.entity';
import { Platform } from 'src/platform/platform.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class ModelPlatform {
  @PrimaryGeneratedColumn()
  id: number;

  @PrimaryColumn()
  model_id: number;

  @PrimaryColumn()
  platform_id: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  site_url: string;

  @Column({ default: 1 })
  number_of_days: number;

  @Column({ default: null })
  scheduled_date: string;

  // This is for cron job.
  @Column({ default: null })
  latest_group_id: number;

  @ManyToOne(() => Model, (model) => model.platforms, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'model_id', referencedColumnName: 'id' }])
  models: Model[];

  @ManyToOne(() => Platform, (platform) => platform.models, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'platform_id', referencedColumnName: 'id' }])
  platforms: Platform[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
