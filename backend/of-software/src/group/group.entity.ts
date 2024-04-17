// src/group/group.entity.ts

import { Message } from 'src/message/message.entity';
import { Platform } from 'src/platform/platform.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  BeforeInsert,
} from 'typeorm';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  model_id: number;

  @Column()
  order: number;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  added_on_platform_at: Date;

  @Column({ default: 1 })
  status: number; // 0: inactive, 1: active

  @BeforeInsert()
  setOrderValue() {
    this.order = this.id;
  }

  @ManyToMany(() => Message, (message) => message.groups, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinTable({
    name: 'group_message',
    joinColumn: {
      name: 'group_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'message_id',
      referencedColumnName: 'id',
    },
  })
  messages?: Message[];

  @ManyToMany(() => Platform, (platform) => platform.groups, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  platforms?: Platform[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
