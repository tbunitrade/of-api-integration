// src/groupMessage/groupMessage.entity.ts

import { Group } from 'src/group/group.entity';
import { Message } from 'src/message/message.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class GroupMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @PrimaryColumn()
  group_id: number;

  @PrimaryColumn()
  message_id: number;

  @Column({ default: 1 })
  status: number; // 0: inactive, 1: active

  @ManyToOne(() => Group, (group) => group.messages, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  //groups: Group[];
  groups: Group;

  @ManyToOne(() => Message, (message) => message.groups, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'message_id', referencedColumnName: 'id' }])
  messages: Message[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
