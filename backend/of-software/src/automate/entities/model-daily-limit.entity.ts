// src/automate/entities/model-daily-limit.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from "typeorm";

@Entity()
@Unique( [ 'model_platform_id' , 'date' ])
export class ModelDailyLimitEntity {
  @PrimaryGeneratedColumn()
  id : number;

  @Column()
  model_platform_id : number; // уникальная связка модель+платформа  OnlyFans, и для Fansly, Subs

  @Column({ type: 'date' })
  date : string // дата в формате YYYY-MM-DD

  @Column({ default: 0 })
  post_count: number;  // сколько постов уже сделано

  @CreateDateColumn()
  created_at: Date;
}
