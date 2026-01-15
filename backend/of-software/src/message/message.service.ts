// src/model/model.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Message } from './message.entity';
import { MessageDto } from 'src/dtos/message.dto';
import { GroupMessage } from 'src/groupMessages/group_message.entity';
import { GroupMessageDto } from 'src/dtos/group_message.dto';
import * as path from 'path';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
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
        throw new BadRequestException('Mass message: vault_media_ids is required when price > 0');
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
        throw new BadRequestException('Mass message: vault_media_ids is required when price > 0');
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

  async findAllByGroupId(id: string): Promise<Message[]> {
    try {
      return await this.messageRepository
        .createQueryBuilder('message')
        .innerJoin(
          'group_message',
          'group_message',
          'message.id = group_message.message_id',
        )
        .where('group_message.group_id = :group_id', { group_id: id })
        .orderBy('message.message_time', 'ASC')
        .getMany();
    } catch (err) {
      console.error('Message findAll error', err);
    }
  }

  async findAllByModelId(id: string, searchStr?: string) {
    try {
      const findQuery = await this.messageRepository
        .createQueryBuilder('message')
        .select(['message.*', 'group.id as group_id, group.name as group_name'])
        .innerJoin(
          'group_message',
          'group_message',
          'message.id = group_message.message_id',
        )
        .innerJoin(
          'group',
          'group',
          'group.model_id = :model_id and group.id = group_message.group_id',
          {
            model_id: id,
          },
        );

      if (searchStr) {
        findQuery.where('message.message LIKE :searchStr ', {
          searchStr: `%${searchStr}%`,
        });
      }

      const result = findQuery.orderBy('message.id').getRawMany();
      return result;
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
      const normalized = this._applyRulesForCreate(payload);

      const newMessage = this.messageRepository.create(normalized);
      return await this.messageRepository.save(newMessage);
    } catch (err) {
      console.error('Message creation error', err);
      throw err;
    }
  }

  async addMessageToGroup(
    group_id: number,
    message_id: number,
  ): Promise<GroupMessage> {
    try {
      const groupMessage = new GroupMessageDto();
      groupMessage.group_id = group_id;
      groupMessage.message_id = message_id;
      const newGroupMessage = this.groupMessageRepository.create(groupMessage);
      const result = await this.groupMessageRepository.save(newGroupMessage);
      return result;
    } catch (err) {
      console.error('Add Message To Group Error', err);
      throw err; // <-- обязательно, иначе ошибка теряется
    }
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
}
