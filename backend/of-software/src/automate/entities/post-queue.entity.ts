// backend/of-software/src/automate/entities/post-queue.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
@Unique(['model_platform_id', 'post_id'])
export class PostQueueEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // ID из таблицы model_platform (PK), НЕ model.model_id
  @Column()
  model_platform_id: number;

  // ID из таблицы post (PK)
  @Column()
  post_id: number;

  // Указатель на СЛЕДУЮЩИЙ caption
  @Column({ type: 'int', default: 0 })
  caption_index: number;

  // Указатель на СЛЕДУЮЩИЙ файл
  @Column( { type: 'int', default: 0 })
  file_index: number;

  // Сколько раз уже публиковали по этой очереди (для прогресса)
  @Column( { type: 'int', default: 0 })
  used_count: number;

  // Размеры очереди текстов на момент создания/обновления
  @Column( { type: 'int', default: 0 })
  total_captions: number;

  // Размеры очереди медия-файлов на момент создания/обновления
  @Column({ type: 'int', default: 0 })
  total_files: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

}
