// src/model/model.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Message } from './message.entity';
import { MessageDto } from 'src/dtos/message.dto';
import { GroupMessage } from 'src/groupMessages/group_message.entity';
import { GroupMessageDto } from 'src/dtos/group_message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
  ) {}

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

  async findAllByModelId(id: string): Promise<Message[]> {
    try {
      return await this.messageRepository
        .createQueryBuilder('message')
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
        )
        .orderBy('message.id')
        .getMany();
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

  async create(group: MessageDto): Promise<Message> {
    try {
      const newMessage = this.messageRepository.create(group);
      const result = await this.messageRepository.save(newMessage);
      return result;
    } catch (err) {
      console.error('Message creation error', err);
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
    }
  }

  async update(id: number, updateMessage: Partial<Message>): Promise<Message> {
    try {
      const options: FindOneOptions<Message> = {
        where: { id },
      };
      const message = await this.messageRepository.findOne(options);

      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      const updatedMessage = await this.messageRepository.save({
        ...message,
        ...updateMessage,
      });

      return updatedMessage;
    } catch (err) {
      console.error('Message update error', err);
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
}
