// src/platform_group/platform_group.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { PlatformGroup } from './platform_group.entity';
import { PlatformGroupDto } from 'src/dtos/platform_group.dto';

@Injectable()
export class PlatformGroupService {
  constructor(
    @InjectRepository(PlatformGroup)
    private readonly platformGroupRepository: Repository<PlatformGroup>,
  ) {}

  async create(platformGroup: PlatformGroupDto): Promise<PlatformGroup> {
    try {
      const { platform_id, group_id } = platformGroup;
      const existingPlatform = await this.platformGroupRepository.findOne({
        where: { platform_id, group_id },
      });
      if (existingPlatform) {
        throw new ConflictException('Platform Group already exists');
      }
      const newPlatform = this.platformGroupRepository.create(platformGroup);
      const result = await this.platformGroupRepository.save(newPlatform);
      const _result = this.findById(result.id);
      return _result;
    } catch (err) {
      console.error('Platform Group create error', err);
    }
  }

  async findByPlatformlId(id: number): Promise<PlatformGroup[] | undefined> {
    try {
      const queryBuilder =
        this.platformGroupRepository.createQueryBuilder('platform_group');

      return await queryBuilder
        .where('platform_group.platform_id = :id', { id })
        .leftJoinAndSelect('platform_group.platform', 'platform')
        .leftJoinAndSelect('platform_group.group', 'group')
        .getMany();
    } catch (err) {
      console.error('PlatformGroup findByPlatformlId error', err);
    }
  }

  async findByGroupId(id: number): Promise<PlatformGroup[] | undefined> {
    try {
      const queryBuilder =
        this.platformGroupRepository.createQueryBuilder('platform_group');

      return await queryBuilder
        .where('platform_group.group_id = :id', { id })
        .getMany();
    } catch (err) {
      console.error('PlatformGroup findByGroupId error', err);
    }
  }

  async findAll(): Promise<PlatformGroup[]> {
    try {
      return await this.platformGroupRepository.find({
        relations: ['platform', 'group'],
      });
      // return await this.platformGroupRepository
      //   .createQueryBuilder('platform_group')
      //   .select('platform_group.model_id', 'model_id')
      //   .addSelect('ARRAY_AGG(platform_group.platform)', 'platform')
      //   .groupBy('platform_group.model_id')
      //   .getRawMany();
    } catch (err) {
      console.error('PlatformGroup findAll error', err);
    }
  }

  async findById(id: number): Promise<PlatformGroup> {
    try {
      const options: FindOneOptions<PlatformGroup> = {
        where: { id },
        relations: ['platform', 'group'],
      };
      return this.platformGroupRepository.findOne(options);
    } catch (err) {
      console.error('PlatformGroup findById error', err);
    }
  }

  async update(
    id: number,
    updatePlatformGroup: Partial<PlatformGroup>,
  ): Promise<PlatformGroup> {
    try {
      const options: FindOneOptions<PlatformGroup> = {
        where: { id },
      };
      const platformGroup = await this.platformGroupRepository.findOne(options);

      if (!platformGroup) {
        throw new NotFoundException(`PlatformGroup with ID ${id} not found`);
      }

      const updatedPlatformGroup = await this.platformGroupRepository.save({
        ...platformGroup,
        ...updatePlatformGroup,
      });

      return updatedPlatformGroup;
    } catch (err) {
      console.error('PlatformGroup update error', err);
    }
  }

  async deletePlatform(id: number): Promise<PlatformGroup> {
    try {
      const options: FindOneOptions<PlatformGroup> = {
        where: { id },
      };
      const platformGroup = await this.platformGroupRepository.findOne(options);

      if (!platformGroup) {
        throw new NotFoundException(`Platform with ID ${id} not found`);
      }

      return await this.platformGroupRepository.remove(platformGroup);
    } catch (err) {
      console.error('PlatformGroup deletePlatform error', err);
    }
  }
}
