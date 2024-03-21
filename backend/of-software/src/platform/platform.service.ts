// src/model/model.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { PlatformDto } from '../dtos/platform.dto';
import { Platform } from './platform.entity';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Platform)
    private readonly platformRepository: Repository<Platform>,
  ) {}

  async create(platform: PlatformDto): Promise<Platform> {
    try {
      const { name } = platform;
      const existingPlatform = await this.platformRepository.findOne({
        where: { name },
      });
      if (existingPlatform) {
        throw new ConflictException('Platform already exists');
      }
      const newPlatform = this.platformRepository.create(platform);
      return await this.platformRepository.save(newPlatform);
    } catch (err) {
      console.error('Platform create error', err);
    }
  }

  async findByName(name: string): Promise<Platform | undefined> {
    try {
      const queryBuilder =
        this.platformRepository.createQueryBuilder('platform');

      return await queryBuilder
        .where('platform.name = :name', { name })
        .getOne();
    } catch (err) {
      console.error('Platform findByName error', err);
    }
  }

  async findAll(): Promise<Platform[]> {
    try {
      return await this.platformRepository.find({
        order: {
          id: 'ASC',
        },
      });
    } catch (err) {
      console.error('Platform findAll error', err);
    }
  }

  async findById(id: number): Promise<Platform> {
    try {
      const options: FindOneOptions<Platform> = {
        where: { id },
      };
      return this.platformRepository.findOne(options);
    } catch (err) {
      console.error('Platform findById error', err);
    }
  }

  async update(
    id: number,
    updatePlatformDto: Partial<Platform>,
  ): Promise<Platform> {
    try {
      const options: FindOneOptions<Platform> = {
        where: { id },
      };
      const platform = await this.platformRepository.findOne(options);

      if (!platform) {
        throw new NotFoundException(`Platform with ID ${id} not found`);
      }

      const updatedPlatform = await this.platformRepository.save({
        ...platform,
        ...updatePlatformDto,
      });

      return updatedPlatform;
    } catch (err) {
      console.error('Platform update error', err);
    }
  }

  async searchPlatforms(query: string): Promise<Platform[]> {
    try {
      const searchResults = await this.platformRepository
        .createQueryBuilder('platform')
        .where('platform.name LIKE :query', { query: `%${query}%` })
        .orderBy('id', 'ASC')
        .getMany();

      return searchResults;
    } catch (err) {
      console.error('Platform searchPlatforms error', err);
    }
  }

  async deletePlatform(id: number): Promise<Platform> {
    try {
      const options: FindOneOptions<Platform> = {
        where: { id },
      };
      const platform = await this.platformRepository.findOne(options);

      if (!platform) {
        throw new NotFoundException(`Platform with ID ${id} not found`);
      }

      return await this.platformRepository.remove(platform);
    } catch (err) {
      console.error('Platform deletePlatform error', err);
    }
  }
}
