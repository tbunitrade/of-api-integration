// src/model/model.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Message } from './message.entity';
import { MessageDto } from 'src/dtos/message.dto';
import { GroupMessage } from 'src/groupMessages/group_message.entity';
import { GroupMessageDto } from 'src/dtos/group_message.dto';
import { Group } from 'src/group/group.entity'; // путь подстрой
import * as path from 'path';
import * as fs from 'fs/promises';


@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  // =======================
  // Massmsg guards/helpers
  // =======================

  private _isProvided(v: any) {
    return v !== undefined; // важно: отличаем "не пришло" от null
  }

  private _normalizeStringArray(input: any): string[] | null {
    if (!Array.isArray(input)) return null;

    const out = input
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0);

    return out.length ? out : null;
  }

  private _normalizePrice(input: any): number {
    if (input === null || input === '') return 0;
    const n = Number(input);
    return Number.isFinite(n) ? n : 0;
  }

  private _applyRulesForCreate(payload: any): Partial<Message> {
    const isMass = payload?.massmsg === true;

    const out: any = { ...payload };
    out.massmsg = isMass;

    if (isMass) {
      out.audience_include_ids = this._normalizeStringArray(payload?.audience_include_ids);
      out.audience_exclude_ids = this._normalizeStringArray(payload?.audience_exclude_ids);
      out.user_ids_array = this._normalizeStringArray(payload?.user_ids_array);
      out.vault_media_ids = this._normalizeStringArray(payload?.vault_media_ids);

      if (this._isProvided(payload?.price)) {
        out.price = this._normalizePrice(payload.price);
      }

      if ((out.price ?? 0) > 0 && (!out.vault_media_ids || out.vault_media_ids.length === 0)) {
        throw new BadRequestException('Mass message: vault_media_ids is required when price > 0 v1');
      }

      return out;
    }

    // обычное сообщение — mass поля очищаем
    out.audience_include_ids = null;
    out.audience_exclude_ids = null;
    out.user_ids_array = null;
    out.vault_media_ids = null;
    out.scheduled_date = null;

    return out;
  }

  private _applyRulesForUpdate(existing: Message, patch: any): Partial<Message> {
    const effectiveMass =
      patch?.massmsg !== undefined ? patch.massmsg === true : existing.massmsg === true;

    const out: any = { ...patch };
    out.massmsg = effectiveMass;

    if (effectiveMass) {
      if (this._isProvided(patch?.audience_include_ids)) {
        out.audience_include_ids = this._normalizeStringArray(patch.audience_include_ids);
      }
      if (this._isProvided(patch?.audience_exclude_ids)) {
        out.audience_exclude_ids = this._normalizeStringArray(patch.audience_exclude_ids);
      }
      if (this._isProvided(patch?.user_ids_array)) {
        out.user_ids_array = this._normalizeStringArray(patch.user_ids_array);
      }
      if (this._isProvided(patch?.vault_media_ids)) {
        out.vault_media_ids = this._normalizeStringArray(patch.vault_media_ids);
      }
      if (this._isProvided(patch?.price)) {
        out.price = this._normalizePrice(patch.price);
      }

      const finalPrice = (this._isProvided(out.price) ? out.price : existing.price) ?? 0;
      const finalVault = this._isProvided(out.vault_media_ids)
        ? out.vault_media_ids
        : existing.vault_media_ids;

      if (finalPrice > 0 && (!finalVault || finalVault.length === 0)) {
        throw new BadRequestException('Mass message: vault_media_ids is required when price > 0 v02');
      }

      return out;
    }

    // переключили mass -> обычный: очищаем mass поля
    const switchedToNonMass = patch?.massmsg === false && existing.massmsg === true;

    if (switchedToNonMass || this._isProvided(patch?.audience_include_ids)) out.audience_include_ids = null;
    if (switchedToNonMass || this._isProvided(patch?.audience_exclude_ids)) out.audience_exclude_ids = null;
    if (switchedToNonMass || this._isProvided(patch?.user_ids_array)) out.user_ids_array = null;
    if (switchedToNonMass || this._isProvided(patch?.vault_media_ids)) out.vault_media_ids = null;
    if (switchedToNonMass || this._isProvided(patch?.scheduled_date)) out.scheduled_date = null;

    return out;
  }

  // =======================
  // Copy attachments helpers
  // =======================

  /**
   * Парсим путь вида:
   *   /uploads/naomi_vip/group3/messages24/files/image/xxx.jpg
   * -> { modelName: 'naomi_vip', groupId: 3, messageId: 24 }
   */
  private _parseUploadsMetaFromContentPath(p: string): { modelName: string; groupId: number; messageId: number } | null {
    const s = String(p || '').trim();
    if (!s) return null;

    const m = s.match(/\/uploads\/([^/]+)\/group(\d+)\/messages(\d+)\//i);
    if (!m) return null;

    const modelName = m[1];
    const groupId = Number(m[2] || 0);
    const messageId = Number(m[3] || 0);

    if (!modelName || !Number.isFinite(groupId) || !Number.isFinite(messageId) || groupId <= 0 || messageId <= 0) {
      return null;
    }

    return { modelName, groupId, messageId };
  }

  private _getUploadsRootDir(): string {
    // если есть env — ок, если нет — стандартно ./uploads
    const envDir = process.env.UPLOADS_DIR;
    if (envDir && String(envDir).trim().length > 0) {
      return path.resolve(String(envDir).trim());
    }
    return path.resolve(process.cwd(), 'uploads');
  }

  /**
   * Копируем ПАПКУ сообщения целиком:
   *   uploads/<model>/group<gid>/messages<oldId> -> uploads/<model>/group<gid>/messages<newId>
   * + переписываем content: messages<oldId> -> messages<newId>
   */
  private async _copyMessageAttachmentsIfNeeded(opts: {
    savedMessage: Message;
    copyFromMessageId: number;
    targetGroupId: number;
  }): Promise<Message> {
    const { savedMessage, copyFromMessageId, targetGroupId } = opts;

    if (!savedMessage) return savedMessage;

    // ЖЁСТКИЙ ГАРД: никаких файловых операций для massmsg
    if (savedMessage.massmsg === true) {
      return savedMessage;
    }

    if (!Number.isFinite(copyFromMessageId) || copyFromMessageId <= 0) {
      return savedMessage;
    }

    const src = await this.messageRepository.findOne({ where: { id: copyFromMessageId } });
    if (!src) {
      console.warn('[MessageService] copy attachments: source message not found id=', copyFromMessageId);
      return savedMessage;
    }

    const srcContent = String(src.content || '').trim();
    if (!srcContent) {
      // нет контента — нечего копировать
      return savedMessage;
    }

    const srcParts = srcContent
      .split(',')
      .map((x) => String(x || '').trim())
      .filter(Boolean);

    if (srcParts.length === 0) return savedMessage;

    // берем первый файл как "якорь" для определения папки
    const meta = this._parseUploadsMetaFromContentPath(srcParts[0]);
    if (!meta) {
      console.warn('[MessageService] copy attachments: cannot parse uploads meta from content:', srcParts[0]);
      return savedMessage;
    }

    // sanity: если в пути почему-то другой messageId — всё равно ориентируемся на copyFromMessageId
    const oldId = Number.isFinite(copyFromMessageId) ? copyFromMessageId : meta.messageId;
    const newId = Number(savedMessage.id);

    const uploadsRoot = this._getUploadsRootDir();

    //const srcDir = path.join(uploadsRoot, meta.modelName, `group${meta.groupId}`, `messages${oldId}`);
    //const dstDir = path.join(uploadsRoot, meta.modelName, `group${meta.groupId}`, `messages${newId}`);

    const dstGroupId = Number.isFinite(targetGroupId) && targetGroupId > 0 ? targetGroupId : meta.groupId;

    const srcDir = path.join(uploadsRoot, meta.modelName, `group${meta.groupId}`, `messages${oldId}`);
    const dstDir = path.join(uploadsRoot, meta.modelName, `group${dstGroupId}`, `messages${newId}`);

    const rewritten = srcParts.map((p) => {
      const p1 = p.replace(new RegExp(`/group${meta.groupId}/`, 'g'), `/group${dstGroupId}/`);
      return p1.replace(new RegExp(`/messages${oldId}/`, 'g'), `/messages${newId}/`);
    });


    try {
      // убедимся что srcDir существует
      await fs.access(srcDir);

      // создаем родителя dstDir (на всякий)
      await fs.mkdir(path.dirname(dstDir), { recursive: true });

      // копируем всю директорию (Node 18+: fs.cp)
      await fs.cp(srcDir, dstDir, { recursive: true, force: true });

      // переписываем content в новой записи
      // const rewritten = srcParts.map((p) => {
      //   // меняем только сегмент /messages{oldId}/ -> /messages{newId}/
      //   return p.replace(new RegExp(`/messages${oldId}/`, 'g'), `/messages${newId}/`);
      // });

      savedMessage.content = rewritten.join(',');
      savedMessage.content_attached = true;

      const updated = await this.messageRepository.save(savedMessage);

      console.log('[MessageService] Full-Copy attachments ok:', {
        from: srcDir,
        to: dstDir,
        oldId,
        newId,
        files: rewritten.length,
      });

      return updated;
    } catch (e) {
      console.error('[MessageService] Full-Copy attachments failed:', {
        from: srcDir,
        to: dstDir,
        oldId,
        newId,
        err: e,
      });
      // НЕ валим создание сообщения — просто возвращаем как есть
      return savedMessage;
    }
  }

  // ===== дальше old методы findAll/findById/... =====

  async findAll(): Promise<Message[]> {
    try {
      return await this.messageRepository.find({
        order: {
          id: 'ASC',
        },
        // relations: ['groups'],
      });
    } catch (err) {
      console.error('Message findAll error', err);
    }
  }

  async findAllByGroupId(id: string, massmsg?: boolean): Promise<Message[]> {
    try {
      const qb = this.messageRepository
        .createQueryBuilder('message')
        .innerJoin('group_message', 'group_message', 'message.id = group_message.message_id')
        .where('group_message.group_id = :group_id', { group_id: id })
        .orderBy('message.message_time', 'ASC')
        .addOrderBy('message.id', 'ASC');

      if (massmsg !== undefined) {
        qb.andWhere('message.massmsg = :massmsg', { massmsg });
      }

      return await qb.getMany();
    } catch (err) {
      console.error('Message findAll error', err);
    }
  }

  async findAllByModelId(id: string, searchStr?: string, massmsg?: boolean) {
    try {
      const qb = this.messageRepository
        .createQueryBuilder('message')
        .select(['message.*', 'group.id as group_id, group.name as group_name'])
        .innerJoin('group_message', 'group_message', 'message.id = group_message.message_id')
        .innerJoin(
          'group',
          'group',
          'group.model_id = :model_id and group.id = group_message.group_id',
          { model_id: id }
        );

      if (searchStr) {
        qb.where('message.message LIKE :searchStr', { searchStr: `%${searchStr}%` });
      }

      if (massmsg !== undefined) {
        // важно: если searchStr есть и ты использовал qb.where выше,
        // то тут нужно andWhere, а не where
        if (searchStr) qb.andWhere('message.massmsg = :massmsg', { massmsg });
        else qb.where('message.massmsg = :massmsg', { massmsg });
      }

      return qb.orderBy('message.message_time', 'ASC').addOrderBy('message.id', 'ASC').getRawMany();
    } catch (err) {
      console.error('Message findAll error', err);
    }
  }

  async findById(id: number): Promise<Message> {
    try {
      const options: FindOneOptions<Message> = {
        where: { id },
        // relations: ['model', 'platform'],
      };
      return this.messageRepository.findOne(options);
    } catch (err) {
      console.error('Message find_by_id error', err);
    }
  }

  async create(payload: Partial<Message>): Promise<Message> {
    try {
      // 1) Снимаем служебные поля (НЕ пишем в БД)
      const anyPayload: any = payload || {};
      const copyFromMessageId = Number(anyPayload.copy_from_message_id || 0);
      const copyWithMedia = anyPayload.copy_with_media === true;


      // чистим служебные поля из payload до нормализации/сейва
      const cleaned: any = { ...anyPayload };
      const targetGroupId = Number(cleaned.group_id || 0);
      delete cleaned.copy_from_message_id;
      delete cleaned.copy_with_media;


      // 2) Нормализация по текущим правилам (mass / non-mass)
      const normalized = this._applyRulesForCreate(cleaned);

      // 3) Сохраняем как раньше
      const newMessage = this.messageRepository.create(normalized);
      const saved = await this.messageRepository.save(newMessage);

      // 4) ЖЁСТКИЙ ГАРД: массовые сообщения не трогаем вообще
      if (saved.massmsg === true) {
        return saved;
      }

      // 5) Full-Copy: физический перенос attachments (только для обычных сообщений)
      if (copyWithMedia && copyFromMessageId > 0) {
        return await this._copyMessageAttachmentsIfNeeded({
          savedMessage: saved,
          copyFromMessageId,
          targetGroupId
        });
      }


      return saved;
    } catch (err) {
      console.error('Message creation error', err);
      throw err;
    }
  }

  // async create(payload: Partial<Message>): Promise<Message> {
  //   try {
  //     const normalized = this._applyRulesForCreate(payload);
  //
  //     const newMessage = this.messageRepository.create(normalized);
  //     return await this.messageRepository.save(newMessage);
  //   } catch (err) {
  //     console.error('Message creation error', err);
  //     throw err;
  //   }
  // }

  // async addMessageToGroup(
  //   group_id: number,
  //   message_id: number,
  // ): Promise<GroupMessage> {
  //   try {
  //     const groupMessage = new GroupMessageDto();
  //     groupMessage.group_id = group_id;
  //     groupMessage.message_id = message_id;
  //     const newGroupMessage = this.groupMessageRepository.create(groupMessage);
  //     const result = await this.groupMessageRepository.save(newGroupMessage);
  //     return result;
  //   } catch (err) {
  //     console.error('Add Message To Group Error', err);
  //     throw err; // <-- обязательно, иначе ошибка теряется
  //   }
  // }

  async addMessageToGroup(group_id: number, message_id: number): Promise<void> {
    await this.groupMessageRepository
      .createQueryBuilder()
      .insert()
      .into(GroupMessage)
      .values({ group_id, message_id })
      .onConflict(`("group_id","message_id") DO NOTHING`)
      .execute();
  }

  async update(id: number, patch: Partial<Message>): Promise<Message> {
    try {
      const options: FindOneOptions<Message> = { where: { id } };
      const existing = await this.messageRepository.findOne(options);

      if (!existing) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      const normalizedPatch = this._applyRulesForUpdate(existing, patch);

      return await this.messageRepository.save({
        ...existing,
        ...normalizedPatch,
      });
    } catch (err) {
      console.error('Message update error', err);
      throw err;
    }
  }

  async delete(id: number): Promise<Message> {
    try {
      const options: FindOneOptions<Message> = {
        where: { id },
      };
      const message = await this.messageRepository.findOne(options);

      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      return await this.messageRepository.remove(message);
    } catch (err) {
      console.error('Message delete error', err);
    }
  }
  async deleteFile(id: number, file: string): Promise<Message> {
    try {
      const options: FindOneOptions<Message> = {
        where: { id },
      };
      const message = await this.messageRepository.findOne(options);

      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      const content = message.content || '';
      const contents = content.split(',') || [];
      const updatedContent = contents.filter((it) => !it.includes(file));
      message.content = updatedContent.join(',');
      const updatedMessage = await this.update(id, message);

      return updatedMessage;
    } catch (err) {
      console.error('Message delete error', err);
    }
  }

  async deleteFileByPath(id: number, file: string): Promise<Message> {

    try {
      const options: FindOneOptions<Message> = { where: { id } };
      const message = await this.messageRepository.findOne(options);
      if (!message) throw new NotFoundException(`Message with ID ${id} not found`);

      const target = (file || '').trim();
      const targetBase = path.basename(target);

      const content = message.content || '';
      const parts = content.split(',').map(s => s.trim()).filter(Boolean);

      const filtered = parts.filter(p => {
        const pTrim = p.trim();
        const pBase = path.basename(pTrim);
        // выкидываем, если совпал полный путь или basename
        return !(pTrim === target || pTrim.endsWith(target) || pBase === targetBase);
      });

      // Если ничего не изменилось — просто вернуть без записи
      if (filtered.length === parts.length) return message;

      message.content = filtered.join(',');
      return await this.update(id, message);
    } catch (err) {
      console.error('Message delete error', err);
      throw err;
    }
  }

  async moveMessageToGroup(message_id: number, new_group_id: number): Promise<void> {
    await this.messageRepository.manager.transaction(async (em) => {
      const msgRepo = em.getRepository(Message);
      const gmRepo = em.getRepository(GroupMessage);
      const gRepo = em.getRepository(Group);

      const message = await msgRepo.findOne({ where: { id: message_id } });
      if (!message) throw new BadRequestException('Message not found');

      const newGroup = await gRepo.findOne({ where: { id: new_group_id } });
      if (!newGroup) throw new BadRequestException('Group not found');

      // 1) Родитель: massmsg должен совпасть
      if ((message.massmsg === true) !== (newGroup.massmsg === true)) {
        throw new BadRequestException('Cannot move message across parents (massmsg mismatch)');
      }

      // 2) Если хочешь ограничить в рамках модели (очень рекомендую):
      // удаляем связи только в рамках этой model_id + massmsg
      await gmRepo
        .createQueryBuilder()
        .delete()
        .from(GroupMessage)
        .where(`message_id = :message_id`, { message_id })
        .andWhere(`
          group_id IN (
            SELECT id FROM public."group"
            WHERE model_id = :model_id AND massmsg = :massmsg
          )
        `, { model_id: newGroup.model_id, massmsg: newGroup.massmsg })
        .execute();

      // 3) Вставляем новую связь (идемпотентно)
      await gmRepo
        .createQueryBuilder()
        .insert()
        .into(GroupMessage)
        .values({ group_id: newGroup.id, message_id })
        .onConflict(`("group_id","message_id") DO NOTHING`)
        .execute();
    });
  }
}
