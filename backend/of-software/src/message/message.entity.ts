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

  @Column({
    type: 'time',
    nullable: true,
  })
  message_time: string;

  @Column({
    type: 'double precision',
    nullable: true,
  })
  price: number;

  @Column({ nullable: true })
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
    type: 'int',
    nullable: true,
  })
  free_preview: number;

  @Column({ type: 'boolean', default: false })
  massmsg: boolean;

  @Column({ type: 'jsonb', nullable: true })
  audience_include_ids: string[];

  @Column({ type: 'jsonb', nullable: true })
  audience_exclude_ids: string[];

  @Column({ type: 'jsonb', nullable: true })
  user_ids_array: string[];

  @Column({ type: 'jsonb', nullable: true })
  vault_media_ids: string[];

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_date: Date;

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
