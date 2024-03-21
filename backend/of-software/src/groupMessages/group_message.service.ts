// src/model/model.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { GroupMessage } from './group_message.entity';
import { GroupMessageDto } from 'src/dtos/group_message.dto';

@Injectable()
export class GroupMessageService {
  constructor(
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
  ) {}

  async create(groupMessage: GroupMessageDto): Promise<GroupMessage> {
    try {
      const { group_id, message_id } = groupMessage;
      const existingGroup = await this.groupMessageRepository.findOne({
        where: { group_id, message_id },
      });
      if (existingGroup) {
        throw new ConflictException('Group_Message already exists');
      }
      const newGroupMessage = this.groupMessageRepository.create(groupMessage);
      const result = await this.groupMessageRepository.save(newGroupMessage);
      return result;
    } catch (err) {
      console.error('GroupMessage create error', err);
    }
  }

  async findAll(): Promise<GroupMessage[]> {
    try {
      return await this.groupMessageRepository.find({
        order: {
          id: 'ASC',
        },
        relations: ['messages'],
      });
    } catch (err) {
      console.error('GroupMessage findAll error', err);
    }
  }

  async findById(id: number): Promise<GroupMessage> {
    try {
      const options: FindOneOptions<GroupMessage> = {
        where: { id },
        // relations: ['model', 'platform'],
      };
      return this.groupMessageRepository.findOne(options);
    } catch (err) {
      console.error('GroupMessage findById error', err);
    }
  }

  async update(
    id: number,
    updateGroupMessage: Partial<GroupMessage>,
  ): Promise<GroupMessage> {
    try {
      const options: FindOneOptions<GroupMessage> = {
        where: { id },
      };
      const groupMessage = await this.groupMessageRepository.findOne(options);

      if (!groupMessage) {
        throw new NotFoundException(`Group_Message with ID ${id} not found`);
      }

      const updatedGroupMessage = await this.groupMessageRepository.save({
        ...groupMessage,
        ...updateGroupMessage,
      });

      return updatedGroupMessage;
    } catch (err) {
      console.error('GroupMessage update error', err);
    }
  }

  async delete(id: number): Promise<GroupMessage> {
    try {
      const options: FindOneOptions<GroupMessage> = {
        where: { id },
      };
      const groupMessage = await this.groupMessageRepository.findOne(options);

      if (!groupMessage) {
        throw new NotFoundException(`Group_Message with ID ${id} not found`);
      }

      return await this.groupMessageRepository.remove(groupMessage);
    } catch (err) {
      console.error('GroupMessage delete error', err);
    }
  }
}
