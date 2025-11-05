//src/automate/entities/model-status-log.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type TaskType = 'post' | 'message';
export type TaskStep = 'login' | 'posting' | 'captcha' | 'upload' | 'scheduling';
export type TaskStatus = 'scheduled' | 'started' | 'success' | 'fail' ;


@Entity()
export class ModelStatusLogEntity {
  @PrimaryGeneratedColumn()
  id : number;

  @Column()
  model_platform_id : number;

  @Column ({ type: 'varchar'})
  type : TaskType; // 'post' | 'message'

  @Column({ type: 'varchar'})
  step : TaskStep; // 'login' | 'posting' | 'captcha' | ...

  @Column( { type: 'varchar'})
  status : TaskStatus; // 'scheduled' | 'started' | 'success' | 'fail'

  @Column( { type: 'text', nullable: true })
  message? : string;

  @CreateDateColumn()
  created_at: Date;
}
