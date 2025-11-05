// src/automate/utils/model-limit.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelDailyLimitEntity } from '../entities/model-daily-limit.entity';

@Injectable()
export class ModelLimitService {
  constructor(
    @InjectRepository(ModelDailyLimitEntity)
    private readonly repo: Repository<ModelDailyLimitEntity>,
  ) {}

  /** Получить лимит постов на сегодня */
  async getTodayLimit(modelPlatformId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const entry = await this.repo.findOne({
      where: { model_platform_id: modelPlatformId, date: today },
    });
    return entry?.post_count || 0;
  }

  /** Инкрементировать количество постов на сегодня */
  async increment(modelPlatformId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.repo.findOne({
      where: { model_platform_id: modelPlatformId, date: today },
    });

    if (existing) {
      await this.repo.update(existing.id, {
        post_count: existing.post_count + 1,
      });
    } else {
      await this.repo.insert({
        model_platform_id: modelPlatformId,
        date: today,
        post_count: 1,
      });
    }
  }
}
