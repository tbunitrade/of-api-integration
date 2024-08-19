// src/post/post.entity.ts

import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { PostCaption } from 'src/postCaption/post_caption.entity';
import { PostFile } from 'src/postFile/post_file.entity';
import { PostTime } from 'src/postTime/post_time.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  model_platform_id: number;

  @Column({
    nullable: true,
  })
  form_tags: string;

  @Column({
    nullable: true,
  })
  user_tags: string;

  @Column({ default: 0 })
  number_of_days: number;

  @Column({ default: null })
  scheduled_date: string;

  @OneToOne(() => ModelPlatform, (modelPlatform) => modelPlatform.post)
  model_platform: ModelPlatform;

  @OneToMany(() => PostCaption, (postCaption) => postCaption.post)
  captions: PostCaption[];

  @OneToMany(() => PostTime, (postTime) => postTime.post)
  post_times: PostTime[];

  @OneToMany(() => PostFile, (postFile) => postFile.post)
  post_files: PostFile[];

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
