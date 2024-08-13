// src/model/model.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { ModelPlatform } from './model_platform.entity';
import { ModelPlatformDto } from 'src/dtos/model_platform.dto';
import { Post } from 'src/post/post.entity';
import { PostDto } from 'src/dtos/post.dto';

@Injectable()
export class ModelPlatformService {
  constructor(
    @InjectRepository(ModelPlatform)
    private readonly modelPlatformRepository: Repository<ModelPlatform>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async create(modelPlatform: ModelPlatformDto): Promise<ModelPlatform> {
    try {
      const { model_id, platform_id } = modelPlatform;
      const existingPlatform = await this.modelPlatformRepository.findOne({
        where: { model_id, platform_id },
      });
      if (existingPlatform) {
        throw new ConflictException('Model Platform already exists');
      }
      const newPlatform = this.modelPlatformRepository.create(modelPlatform);
      const result = await this.modelPlatformRepository.save(newPlatform);

      const prevPostOption: FindOneOptions<Post> = {
        where: { model_platform_id: result.id },
      };
      const prevPost = await this.postRepository.findOne(prevPostOption);
      if (prevPost) {
        await this.postRepository.remove(prevPost);
      }
      const newPostOption: PostDto = {
        model_platform_id: result.id,
      };
      const newPost = this.postRepository.create(newPostOption);
      const postResult = await this.postRepository.save(newPost);

      const data = { post_id: postResult.id };
      const _rst = await this.modelPlatformRepository.update(
        { id: result.id },
        data,
      );

      return result;
    } catch (err) {
      console.error('ModelPlatform create error', err);
    }
  }

  async findByModelId(id: number): Promise<ModelPlatform[] | undefined> {
    try {
      const queryBuilder =
        this.modelPlatformRepository.createQueryBuilder('model_platform');

      return await queryBuilder
        .where('model_platform.model_id = :id', { id })
        .leftJoinAndSelect('model_platform.models', 'models')
        .leftJoinAndSelect('model_platform.platforms', 'platforms')
        .getMany();
    } catch (err) {
      console.error('ModelPlatform findByModelId error', err);
    }
  }

  // async findModelWithPlatform(): Promise<ModelPlatform[] | undefined> {
  //   try {
  //     const queryBuilder =
  //       this.modelPlatformRepository.createQueryBuilder('model');

  //     return await queryBuilder
  //       .leftJoinAndSelect('model_platform', 'model_platform')
  //       .leftJoinAndSelect('model_platform.models', 'models')
  //       .leftJoinAndSelect('model_platform.platforms', 'platforms')
  //       .getMany();
  //   } catch (err) {
  //     console.error('ModelPlatform findByModelId error', err);
  //   }
  // }

  async findByPlatformId(id: number): Promise<ModelPlatform[] | undefined> {
    try {
      const queryBuilder =
        this.modelPlatformRepository.createQueryBuilder('model_platform');

      return await queryBuilder
        .where('model_platform.platform_id = :id', { id })
        .getMany();
    } catch (err) {
      console.error('ModelPlatform findByPlatformId error', err);
    }
  }

  async findAll(rel: boolean = true): Promise<ModelPlatform[]> {
    try {
      return await this.modelPlatformRepository.find(
        rel ? { relations: ['models', 'platforms'] } : {},
      );
      // return await this.modelPlatformRepository
      //   .createQueryBuilder('model_platform')
      //   .select('model_platform.model_id', 'model_id')
      //   .addSelect('ARRAY_AGG(model_platform.platform)', 'platform')
      //   .groupBy('model_platform.model_id')
      //   .getRawMany();
    } catch (err) {
      console.error('ModelPlatform findAll error', err);
    }
  }

  async findById(id: number): Promise<ModelPlatform> {
    try {
      const options: FindOneOptions<ModelPlatform> = {
        where: { id },
        relations: ['models', 'platforms'],
      };
      return this.modelPlatformRepository.findOne(options);
    } catch (err) {
      console.error('ModelPlatform findById error', err);
    }
  }

  async findByModelAndPlatform(
    model_id: number,
    platform_id: number,
  ): Promise<ModelPlatform> {
    try {
      const options: FindOneOptions<ModelPlatform> = {
        where: { model_id, platform_id },
        relations: ['models', 'platforms'],
      };
      return this.modelPlatformRepository.findOne(options);
    } catch (err) {
      console.error('ModelPlatform findById error', err);
    }
  }

  async update(
    id: number,
    updateModelPlatform: Partial<ModelPlatform>,
  ): Promise<ModelPlatform> {
    try {
      const options: FindOneOptions<ModelPlatform> = {
        where: { id },
      };
      const modelPlatform = await this.modelPlatformRepository.findOne(options);

      if (!modelPlatform) {
        throw new NotFoundException(`Model Platform with ID ${id} not found`);
      }
      const data = {
        ...modelPlatform,
        ...updateModelPlatform,
      };
      delete data['platforms'];
      delete data['models'];
      const updatedModelPlatform =
        await this.modelPlatformRepository.save(data);

      return updatedModelPlatform;
    } catch (err) {
      console.error('ModelPlatform update error', err);
    }
  }

  async deletePlatform(id: number): Promise<ModelPlatform> {
    try {
      const options: FindOneOptions<ModelPlatform> = {
        where: { id },
      };
      const modelPlatform = await this.modelPlatformRepository.findOne(options);

      if (!modelPlatform) {
        throw new NotFoundException(`Platform with ID ${id} not found`);
      }

      return await this.modelPlatformRepository.remove(modelPlatform);
    } catch (err) {
      console.error('ModelPlatform deletePlatform error', err);
    }
  }
}
