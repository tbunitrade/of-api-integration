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

  async canSchedulePost(modelPlatformId: number) {
    const WINDOW_MS = 24 * 60 * 60 * 1000; // delay for publishing 24 h
    const now = new Date();

    let limit = await this.repo.findOne({
      where: { model_platform_id: modelPlatformId },
    });

    if ( !limit ) {
      limit = this.repo.create({
        model_platform_id : modelPlatformId,
        windows_start_at : now,
        used_count: 0
      });
    }

    // check 1️⃣ Проверяем, не истекло ли окно
    if ( !limit.windiw_start_at || now.getTime() - limit.window_start_at.getTime() >= WINDOW_MS ) {
      //new zone to publishing
      limit.window_start_at = now;
      limit.used_count = 0;
    }

    // check 2️⃣ Уже достигнут лимит?
    if ( limit.used_count >= 50) {
      const resetAt = new Date( limit.window_start_at.getTime() + WINDOW_MS );
      return {
        allowed : false,
        remaining : 0,
        resetAt,
      };
    }

    // 3️⃣ Увеличиваем счётчик и сохраняем
    limit.used_count += 1;
    await this.repo.save(limit);

    return {
      allowed : true,
      remaining = 50 - limit.used_count,
      resetAt: new Date( limit.window_start_at.getTime() + WINDOW_MS )
    };

  }

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
