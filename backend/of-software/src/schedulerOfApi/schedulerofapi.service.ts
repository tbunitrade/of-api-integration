// backend/of-software/src/schedulerOfApi/schedulerofapi.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {Between, Repository} from 'typeorm';
import { SchedulerOfApiEntity } from './schedulerofapi.entity';
import { ApiMassMessageService } from '../automate/api-mass-message.service';
import { CreateSchedulerOfApiDto } from '../dtos/create-schedulerofapi.dto';
import { UpdateSchedulerOfApiDto } from '../dtos/update-schedulerofapi.dto';

@Injectable()
export class SchedulerOfApiService {
  constructor(
    @InjectRepository(SchedulerOfApiEntity)
    private readonly repo: Repository<SchedulerOfApiEntity>,
    private readonly apiMassMessageService: ApiMassMessageService,
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
    const scheduledAt = dto.scheduled_at ? new Date(dto.scheduled_at) : null;

    const row = this.repo.create({
      model_platform_id: dto.model_platform_id,
      group_id: dto.group_id ?? null,
      message_id: dto.message_id ?? null,
      job_type: dto.job_type ?? 'massmsg',
      status: dto.status ?? 'queued',
      payload: dto.payload ?? null,
      scheduled_at: scheduledAt,
    });

    try {
      return await this.repo.save(row);
    } catch (e: any) {
      // Postgres unique violation
      if (e?.code === '23505') {
        // вернем уже существующий job, чтобы фронт не получал 500
        const exists = await this.repo.findOne({
          where: {
            model_platform_id: row.model_platform_id,
            group_id: row.group_id,
            message_id: row.message_id,
            job_type: row.job_type,
            // ранее думал об удалении scheduled_at
            scheduled_at: row.scheduled_at,
          } as any,
        });

        if (exists) return exists;

        // если вдруг не нашли — отдай нормальный конфликт вместо 500
        throw new ConflictException('Job already exists');
      }

      throw e;
    }
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

  // FIX jobs
  async purge(params: any = {}) {
    const qb = this.repo.createQueryBuilder().delete().from(SchedulerOfApiEntity);

    if (params.model_platform_id) qb.andWhere('model_platform_id = :mp', { mp: Number(params.model_platform_id) });
    if (params.group_id) qb.andWhere('group_id = :gid', { gid: Number(params.group_id) });
    if (params.message_id) qb.andWhere('message_id = :mid', { mid: Number(params.message_id) });
    if (params.status) qb.andWhere('status = :st', { st: String(params.status) });
    if (params.job_type) qb.andWhere('job_type = :jt', { jt: String(params.job_type) });

    // опционально: только “тестовые”, если ты помечаешь payload.test=true
    if (params.only_test === '1') qb.andWhere(`(payload->>'test')::boolean = true`);

    //COALESCE((payload->>'test')::boolean, false) = true

    const r = await qb.execute();
    return { ok: true, affected: r.affected || 0 };
  }

  // dispatcher
  //   Это ручной синхронный dispatcher (без параллели), который:
  // 	•	берёт jobs со status='queued'
  // 	•	если force != 1 → берёт только готовые: scheduled_at <= NOW() (или null)
  // 	•	если force=1 → игнорирует время и шлёт всё queued
  // 	•	обрабатывает по одному в for .. of (никаких гонок)
  async dispatch(params: any = {}) {
    const limit = Math.min(Number(params.limit || 20), 200);
   //const force = params.force === '1';

    const force =
      params.force === '1' ||
      params.force === 1 ||
      params.force === true ||
      params.force === 'true';

    const statuses = ['queued'];
    if (params.retry_failed === '1') statuses.push('failed');

    const qb = this.repo.createQueryBuilder('s')
      .where('s.status IN (:...st)', { st: statuses })
      .orderBy('s.id', 'ASC')
      .take(limit);

    if (params.model_platform_id) qb.andWhere('s.model_platform_id = :mp', { mp: Number(params.model_platform_id) });
    if (params.job_type) qb.andWhere('s.job_type = :jt', { jt: String(params.job_type) });

    if (!force) {
      qb.andWhere('s.scheduled_at IS NULL OR s.scheduled_at <= NOW()');
    }

    const jobs = await qb.getMany();

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const job of jobs) {
      processed++;

      try {
        job.attempt = (job.attempt || 0) + 1;
        job.status = 'processing';
        job.error = null;
        await this.repo.save(job);

        // scheduledDate должен быть UTC ISO string
        const scheduledDate = job.scheduled_at ? new Date(job.scheduled_at).toISOString() : null;

        // payload уже содержит всё нужное для massmsg
        const payload = {
          ...(job.payload || {}),
          modelPlatformId: job.model_platform_id,
          model_platform_id: job.model_platform_id,
          group_id: job.group_id,
          message_id: job.message_id,
          scheduledDate, // <-- важно
          skipValidateLists: true, // ✅ ВАЖНО: чтобы НЕ дергать user-lists
        };


        console.log('[schedulerofapi][dispatch] sending job id=', job.id);
        console.log('[schedulerofapi][dispatch] payload keys=', Object.keys(payload || {}));
        console.log('[schedulerofapi][dispatch] payload scheduledDate=', payload?.scheduledDate);

        // ВАЖНО: здесь должен быть твой реальный метод отправки в провайдера
        // Название у тебя может отличаться. Идея: один вызов = один job.
        const providerResp = await this.apiMassMessageService.startMassMessage(payload);

        job.provider_response = providerResp as any;
        job.provider_date = new Date().toISOString() as any;

        // если провайдер возвращает id — сохрани
        if ((providerResp as any)?.data?.id) job.external_id = String((providerResp as any).data.id);

        const accepted =
          !!(providerResp as any)?.data?.id &&
          (providerResp as any)?.data?.hasError !== true;

        if (!accepted) {
          job.status = 'failed';
          job.error = { note: 'Provider did not accept job', providerResp } as any;
          await this.repo.save(job);
          failed++;
          continue;
        }

        job.status = 'sent';
        await this.repo.save(job);
        sent++;
      } catch (e: any) {
        job.status = 'failed';
        job.error = (e?.response?.data || e?.message || String(e)) as any;
        await this.repo.save(job);
        failed++;
      }
    }

    return { ok: true, processed, sent, failed, force };
  }

  async list(q: any) {
    const page = Math.max(1, Number(q?.page || 1));
    const limit = Math.min(200, Math.max(1, Number(q?.limit || 50)));
    const skip = (page - 1) * limit;

    const model_platform_id = q?.model_platform_id ? Number(q.model_platform_id) : undefined;
    const group_id = q?.group_id ? Number(q.group_id) : undefined;
    const message_id = q?.message_id ? Number(q.message_id) : undefined;

    const job_type = q?.job_type ? String(q.job_type).trim() : undefined;
    const status = q?.status ? String(q.status).trim() : undefined;

    const from = q?.from ? new Date(String(q.from)) : undefined;
    const to = q?.to ? new Date(String(q.to)) : undefined;

    if (from && Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from date');
    if (to && Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to date');

    const where: any = {};
    if (model_platform_id) where.model_platform_id = model_platform_id;
    if (group_id) where.group_id = group_id;
    if (message_id) where.message_id = message_id;
    if (job_type) where.job_type = job_type;
    if (status) where.status = status;

    // if (from && to) where.scheduled_at = Between(from, to);
    // else if (from) where.scheduled_at = Between(from, new Date('2999-01-01'));
    // else if (to) where.scheduled_at = Between(new Date('1970-01-01'), to);

    // станет (если в entity scheduledAt):
    if (from && to) where.scheduledAt = Between(from, to);
    else if (from) where.scheduledAt = Between(from, new Date('2999-01-01'));
    else if (to) where.scheduledAt = Between(new Date('1970-01-01'), to);

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { id: 'DESC' }, // удобнее как “живой лог”
      take: limit,
      skip,
    });

    return { items, total, page, limit };
  }

}
