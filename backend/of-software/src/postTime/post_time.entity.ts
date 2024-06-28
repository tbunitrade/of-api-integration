// src/post/post_time.entity.ts

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Post } from '../post/post.entity';
import { PostCaption } from 'src/postCaption/post_caption.entity';

@Entity()
export class PostTime {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  post_id: number;

  @UpdateDateColumn({
    type: 'time',
    nullable: true,
  })
  time: string;

  @ManyToOne(() => Post, (post) => post.post_times, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'post_id', referencedColumnName: 'id' }])
  post: Post;

  @OneToMany(() => PostCaption, (postCaption) => postCaption.post_time)
  captions: PostCaption[];

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
