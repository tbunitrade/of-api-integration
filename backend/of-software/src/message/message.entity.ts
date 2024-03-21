// src/message/message.entity.ts

import { Group } from 'src/group/group.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @UpdateDateColumn({
    type: 'time',
    nullable: true,
  })
  message_time: string;

  @Column({
    type: 'float',
    nullable: true,
  })
  price: number;

  @Column()
  message_list: string;

  @Column({
    nullable: true,
  })
  message: string;

  @Column({
    nullable: true,
  })
  message_exclude_list: string;

  @Column({
    nullable: true,
  })
  content: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  content_attached: boolean;

  @Column({
    nullable: true,
  })
  release_form_tags: string;

  @Column({
    nullable: true,
  })
  release_user_tags: string;

  @Column({
    nullable: true,
  })
  free_preview: number;

  @Column({ default: 1 })
  status: number; // 0: inactive, 1: active

  @ManyToMany(() => Group, (group) => group.messages, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  groups?: Group[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
