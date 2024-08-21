// src/model/model.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { ModelDto } from '../dtos/model.dto';
import { Model } from './model.entity';

@Injectable()
export class ModelService {
  constructor(
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
  ) {}

  async create(model: ModelDto): Promise<Model> {
    try {
      const { name } = model;
      const existingModel = await this.modelRepository.findOne({
        where: { name },
      });
      if (existingModel) {
        throw new ConflictException('Model already exists');
      }
      const newModel = this.modelRepository.create(model);
      return await this.modelRepository.save(newModel);
    } catch (err) {
      console.error('Model create error', err);
    }
  }

  async findByName(name: string): Promise<Model | undefined> {
    try {
      const queryBuilder = this.modelRepository.createQueryBuilder('model');

      return await queryBuilder.where('model.name = :name', { name }).getOne();
    } catch (err) {
      console.error('Model findByName error', err);
    }
  }

  async findAll(): Promise<Model[]> {
    try {
      return await this.modelRepository.find({
        order: {
          name: 'ASC',
        },
        relations: ['platforms'],
      });
    } catch (err) {
      console.error('Model findAll error', err);
    }
  }

  async findModelWithPlatform(): Promise<Model[] | undefined> {
    try {
      const queryBuilder = this.modelRepository.createQueryBuilder('model');

      const result = await queryBuilder
        .leftJoinAndSelect('model.model_platforms', 'model_platforms')
        .leftJoinAndSelect('model_platforms.platforms', 'platforms')
        .getMany();
      return result;
    } catch (err) {
      console.error('ModelPlatform findByModelId error', err);
    }
  }

  async findById(id: number): Promise<Model> {
    try {
      const options: FindOneOptions<Model> = {
        where: { id },
      };
      return this.modelRepository.findOne(options);
    } catch (err) {
      console.error('Model findById error', err);
    }
  }

  async update(id: number, updateModelDto: Partial<Model>): Promise<Model> {
    try {
      const options: FindOneOptions<Model> = {
        where: { id },
      };
      const model = await this.modelRepository.findOne(options);

      if (!model) {
        throw new NotFoundException(`Model with ID ${id} not found`);
      }

      const updatedModel = await this.modelRepository.save({
        ...model,
        ...updateModelDto,
      });

      return updatedModel;
    } catch (err) {
      console.error('Model update error', err);
    }
  }

  async searcModels(query: string): Promise<Model[]> {
    try {
      const searchResults = await this.modelRepository
        .createQueryBuilder('model')
        .where('model.name LIKE :query', { query: `%${query}%` })
        .getMany();

      return searchResults;
    } catch (err) {
      console.error('Model searcModels error', err);
    }
  }

  async deleteModel(id: number): Promise<Model> {
    try {
      const options: FindOneOptions<Model> = {
        where: { id },
      };
      const model = await this.modelRepository.findOne(options);

      if (!model) {
        throw new NotFoundException(`Model with ID ${id} not found`);
      }

      return await this.modelRepository.remove(model);
    } catch (err) {
      console.error('Model deleteModel error', err);
    }
  }
}
