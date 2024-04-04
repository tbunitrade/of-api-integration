// src/model/model.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, In, Repository } from 'typeorm';
import { Group } from './group.entity';
import { GroupDto } from 'src/dtos/group.dto';
import { PlatformGroupDto } from 'src/dtos/platform_group.dto';
import { PlatformGroup } from 'src/platformGroup/platform_group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,

    @InjectRepository(PlatformGroup)
    private readonly platformGroupRepository: Repository<PlatformGroup>,
  ) {}

  async create(group: GroupDto): Promise<Group> {
    try {
      const { name, model_id } = group;
      const existingGroup = await this.groupRepository.findOne({
        where: { name, model_id },
      });
      if (existingGroup) {
        throw new ConflictException('Group already exists');
      }
      const newGroup = this.groupRepository.create(group);
      const result = await this.groupRepository.save(newGroup);
      return result;
    } catch (err) {
      console.error('Group create error', err);
    }
  }

  async addGroupToPlatform(
    platform_id: number,
    group_id: number,
  ): Promise<PlatformGroup> {
    try {
      const platformGroup = new PlatformGroupDto();
      platformGroup.group_id = group_id;
      platformGroup.platform_id = platform_id;
      const newPlatformMessage =
        this.platformGroupRepository.create(platformGroup);
      const result =
        await this.platformGroupRepository.save(newPlatformMessage);
      return result;
    } catch (err) {
      console.error('Add Message To Group Error', err);
    }
  }

  async findAll(): Promise<Group[]> {
    try {
      return await this.groupRepository.find({
        order: {
          id: 'ASC',
        },
      });
    } catch (err) {
      console.error('Group findAll error', err);
    }
  }

  async findAllByModelPlatform(
    model_id: number,
    platform_id: number,
  ): Promise<any> {
    try {
      const result = await this.groupRepository
        .createQueryBuilder('group')
        .innerJoin(
          'platform_group',
          'platform_group',
          'group.id = platform_group.group_id',
        )
        .leftJoinAndSelect('group.messages', 'messages')
        .addSelect('COUNT(messages.id)', 'messageCount')
        .where('platform_group.platform_id = :platform_id', { platform_id })
        .andWhere('group.model_id = :model_id', { model_id })
        .groupBy('group.id,messages.id')
        .orderBy('group.id')
        .getMany();
      return result;
    } catch (err) {
      console.error('Group findAll error', err);
    }
  }

  async findGroupByPlatformId(platform_id: number): Promise<Group[]> {
    try {
      const queryBuilder = this.groupRepository.createQueryBuilder('group');
      return await queryBuilder
        .innerJoin('group.platforms', 'platform')
        .where('platform.id = :platform_id', { platform_id })
        .getMany();
    } catch (err) {
      console.error('Group findGroupByPlatformId error', err);
    }
  }

  async findNGroupsByPlatformId(
    platform_id: number,
    group_id: number,
    model_id: number,
    count: number,
  ): Promise<Group[]> {
    try {
      try {
        const queryBuilder = this.groupRepository.createQueryBuilder('group');
        return await queryBuilder
          .innerJoin('group.platforms', 'platform')
          .where('platform.id = :platform_id', { platform_id })
          .andWhere('group.model_id = :model_id', { model_id })
          .andWhere('group.id > :group_id', { group_id })
          .andWhere('group.status = 1')
          .take(count)
          .getMany();
      } catch (err) {
        console.error('Group findGroupByPlatformId error', err);
      }
    } catch (err) {
      console.error('Group findGroupByPlatformId error', err);
    }
  }

  async findAllWithMessages(): Promise<Group[]> {
    try {
      return await this.groupRepository.find({
        order: {
          id: 'ASC',
        },
        relations: ['messages'],
      });
    } catch (err) {
      console.error('Group findAll error', err);
    }
  }

  async getGroupWithMessages(groupId: number): Promise<Group | undefined> {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ['messages'],
      });
      return group;
    } catch (err) {
      console.error('Group getGroupWithMessages error', err);
    }
  }

  async getGroupsWithMessages(groupIds: number[]): Promise<Group[]> {
    try {
      const group = await this.groupRepository.find({
        where: { id: In(groupIds) },
        relations: ['messages'],
      });
      return group;
    } catch (err) {
      console.error('Group getGroupWithMessages error', err);
      return [];
    }
  }

  async findById(id: number): Promise<Group> {
    try {
      const options: FindOneOptions<Group> = {
        where: { id },
        relations: ['messages'],
      };
      return this.groupRepository.findOne(options);
    } catch (err) {
      console.error('Group findById error', err);
    }
  }

  async update(id: number, updateGroup: Partial<Group>): Promise<Group> {
    try {
      const options: FindOneOptions<Group> = {
        where: { id },
      };
      const group = await this.groupRepository.findOne(options);

      if (!group) {
        throw new NotFoundException(`Group with ID ${id} not found`);
      }

      const updatedGroup = await this.groupRepository.save({
        ...group,
        ...updateGroup,
      });

      return updatedGroup;
    } catch (err) {
      console.error('Group update error', err);
    }
  }

  async bulkUpdateStatus(groupIds: number[], status: number): Promise<boolean> {
    try {
      await this.groupRepository
        .createQueryBuilder()
        .update(Group)
        .set({ status: status })
        .whereInIds(groupIds)
        .execute();

      return true;
    } catch (err) {
      console.error('Group update error', err);
    }
  }

  async delete(id: number): Promise<Group> {
    try {
      const options: FindOneOptions<Group> = {
        where: { id },
      };
      const group = await this.groupRepository.findOne(options);

      if (!group) {
        throw new NotFoundException(`Group with ID ${id} not found`);
      }

      return await this.groupRepository.remove(group);
    } catch (err) {
      console.error('Group delete error', err);
    }
  }
}
