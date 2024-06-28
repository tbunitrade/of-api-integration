// src/post/post_caption.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PostTime } from '../postTime/post_time.entity';

@Entity()
export class PostCaption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  post_time_id: number;

  @Column()
  caption: string;

  @ManyToOne(() => PostTime, (post_time) => post_time.captions, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'post_time_id', referencedColumnName: 'id' }])
  post_time: PostTime;

  @Column({ default: 1 })
  status: number; // 0: inactive, 1: active

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
