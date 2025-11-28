// src/automate/utils/model-limit.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelDailyLimitEntity } from '../entities/model-daily-limit.entity';

// src/automate/utils/model-limit.service.ts

@Injectable()
export class ModelLimitService {
  constructor(
    @InjectRepository(ModelDailyLimitEntity)
    private readonly repo: Repository<ModelDailyLimitEntity>,
  ) {}

  // ✅ Лимит 50 постов в СУТКИ (по дате)
  async canSchedulePost(modelPlatformId: number) {
    const LIMIT = 50;

    // "Сегодня" в формате YYYY-MM-DD
    const todayStr = new Date().toISOString().slice(0, 10);

    let limit = await this.repo.findOne({
      where: {
        model_platform_id: modelPlatformId,
        date: todayStr,
      },
    });

    // Если записи на сегодня нет — создаём с нулевым счетчиком
    if (!limit) {
      limit = this.repo.create({
        model_platform_id: modelPlatformId,
        date: todayStr,
        post_count: 0,
      });
    }

    // Уже достигли лимит?
    if (limit.post_count >= LIMIT) {
      // resetAt = начало следующего дня (UTC, можно потом подправить под таймзону)
      const resetAt = new Date(todayStr + 'T00:00:00.000Z');
      resetAt.setUTCDate(resetAt.getUTCDate() + 1);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Иначе увеличиваем счётчик и сохраняем
    limit.post_count += 1;
    await this.repo.save(limit);

    const resetAt = new Date(todayStr + 'T00:00:00.000Z');
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);

    return {
      allowed: true,
      remaining: LIMIT - limit.post_count,
      resetAt,
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

  /** Инкрементировать количество постов на сегодня (если нужно где-то ещё) */
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
