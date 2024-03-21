// src/model/model.entity.ts

import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { Platform } from 'src/platform/platform.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
} from 'typeorm';

@Entity()
export class Model {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  photo: string;

  @ManyToMany(() => Platform, (platform) => platform.models, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinTable({
    name: 'model_platform',
    joinColumn: {
      name: 'model_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'platform_id',
      referencedColumnName: 'id',
    },
  })
  platforms?: Platform[];

  @OneToMany(() => ModelPlatform, (modelPlatform) => modelPlatform.models)
  model_platforms: ModelPlatform[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
