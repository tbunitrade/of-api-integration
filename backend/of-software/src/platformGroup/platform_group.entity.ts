// src/platform_group/platform_group.entity.ts

import { Platform } from 'src/platform/platform.entity';
import { Group } from 'src/group/group.entity';
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
export class PlatformGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @PrimaryColumn()
  platform_id: number;

  @PrimaryColumn()
  group_id: number;

  @Column({ default: 1 })
  status: number;

  @ManyToOne(() => Platform, (platform) => platform.groups, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'platform_id', referencedColumnName: 'id' }])
  platforms: Platform[];

  @ManyToOne(() => Group, (group) => group.platforms, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'group_id', referencedColumnName: 'id' }])
  groups: Group[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
