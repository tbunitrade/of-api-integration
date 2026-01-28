// backend/of-software/src/schedulerOfApi/schedulerofapi.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerOfApiEntity } from './schedulerofapi.entity';
import { CreateSchedulerOfApiDto } from '../dtos/create-schedulerofapi.dto';
import { UpdateSchedulerOfApiDto } from '../dtos/update-schedulerofapi.dto';

@Injectable()
export class SchedulerOfApiService {
  constructor(
    @InjectRepository(SchedulerOfApiEntity)
    private readonly repo: Repository<SchedulerOfApiEntity>,
  ) {}

  async findAll(params: any = {}) {
    const qb = this.repo.createQueryBuilder('s').orderBy('s.id', 'DESC');

    if (params.model_platform_id) qb.andWhere('s.model_platform_id = :mp', { mp: Number(params.model_platform_id) });
    if (params.status) qb.andWhere('s.status = :st', { st: String(params.status) });
    if (params.job_type) qb.andWhere('s.job_type = :jt', { jt: String(params.job_type) });
    if (params.external_id) qb.andWhere('s.external_id = :ex', { ex: String(params.external_id) });

    const limit = Math.min(Number(params.limit || 50), 200);
    const offset = Math.max(Number(params.offset || 0), 0);

    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async findById(id: number) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`schedulerofapi id=${id} not found`);
    return row;
  }

  async create(dto: CreateSchedulerOfApiDto) {
    const row = this.repo.create({
      model_platform_id: dto.model_platform_id,
      group_id: dto.group_id ?? null,
      message_id: dto.message_id ?? null,
      job_type: dto.job_type ?? 'massmsg',
      status: dto.status ?? 'queued',
      payload: dto.payload ?? null,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
    });

    return this.repo.save(row);
  }

  async update(id: number, dto: UpdateSchedulerOfApiDto) {
    const row = await this.findById(id);

    if (dto.status !== undefined) row.status = dto.status as any;
    if (dto.attempt !== undefined) row.attempt = dto.attempt;
    if (dto.error !== undefined) row.error = dto.error as any;
    //if (dto.external_id !== undefined) row.external_id = dto.external_id as any;
    if (dto.external_id !== undefined) row.external_id = dto.external_id ?? null;
    if (dto.payload !== undefined) row.payload = dto.payload;
    if (dto.provider_response !== undefined) row.provider_response = dto.provider_response;
    if (dto.scheduled_at !== undefined) row.scheduled_at = dto.scheduled_at ? new Date(dto.scheduled_at) : null;

    return this.repo.save(row);
  }

  /**
   * Простой хелпер: дернуть provider queue, обновить provider_* поля и status.
   * Пока заглушка — подключим ofapi client потом.
   */
  async sync(id: number) {
    const row = await this.findById(id);

    // TODO: здесь будет вызов ofapi:
    // const data = await ofapi.getMassQueue(row.external_id)
    // затем маппинг provider_response -> provider_* + status

    return {
      ok: true,
      id: row.id,
      note: 'sync() stub — подключим ofapi позже',
    };
  }
}
