import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { FindOneOptions, Repository } from 'typeorm';
import { PostDto } from 'src/dtos/post.dto';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(ModelPlatform)
    private readonly modelPlatformRepository: Repository<ModelPlatform>,
  ) {}

  async findAll(rel: boolean = true): Promise<Post[]> {
    try {
      return await this.postRepository.find(
        rel ? { relations: ['post_times', 'captions'] } : {},
      );

      // return await this.modelPlatformRepository
      //   .createQueryBuilder('model_platform')
      //   .select('model_platform.model_id', 'model_id')
      //   .addSelect('ARRAY_AGG(model_platform.platform)', 'platform')
      //   .groupBy('model_platform.model_id')
      //   .getRawMany();
    } catch (err) {
      console.error('Post findAll error', err);
    }
  }

  async getPostTimesAndCaptionsForModelPlatform(
    post_id: number,
  ): Promise<Post> {
    const options: FindOneOptions<Post> = {
      where: { model_platform_id: post_id },
      relations: ['post_times', 'captions'],
    };
    return await this.postRepository.findOne(options);
  }

  async findById(id: number): Promise<Post> {
    try {
      const options: FindOneOptions<Post> = {
        where: { id },
        relations: ['post_times', 'captions'],
      };
      return await this.postRepository.findOne(options);
    } catch (err) {
      console.error('Post findById error', err);
    }
  }

  async findByModelIdAndPlatformId(
    model_id: number,
    platform_id: number,
  ): Promise<Post> {
    try {
      const options: FindOneOptions<ModelPlatform> = {
        where: { model_id, platform_id },
      };
      const modelPlatform: ModelPlatform =
        await this.modelPlatformRepository.findOne(options);
      if (!modelPlatform) {
        throw new NotFoundException(
          `Model with ID:${model_id} and Platform with ID:${platform_id} not found`,
        );
      }
      const postOptions: FindOneOptions<Post> = {
        where: { model_platform_id: modelPlatform.id },
        relations: ['post_times', 'captions'],
      };
      const post = await this.postRepository.findOne(postOptions);
      if (!post) {
        throw new NotFoundException(
          `Post with ModelID:${model_id} and PlatformID:${platform_id} not found`,
        );
      }
      return post;
    } catch (err) {
      console.error('Post findById error', err);
      throw err;
    }
  }

  async create(post: PostDto): Promise<Post> {
    try {
      const { model_platform_id } = post;
      const existingPost = await this.postRepository.findOne({
        where: { model_platform_id },
      });
      if (existingPost) {
        throw new ConflictException('Post already exists');
      }
      const newPost = this.postRepository.create(post);
      const result = await this.postRepository.save(newPost);
      const _result = await this.findById(result.id);
      return _result;
    } catch (err) {
      console.error('PostTime create error', err);
      throw err;
    }
  }

  async update(id: number, updatePost: Partial<Post>): Promise<Post> {
    try {
      const options: FindOneOptions<Post> = {
        where: { id },
      };
      const post = await this.postRepository.findOne(options);

      if (!post) {
        throw new NotFoundException(`Post with ID ${id} not found`);
      }
      const data = {
        ...post,
        ...updatePost,
      };
      const updatedPost = await this.postRepository.save(data);

      return updatedPost;
    } catch (err) {
      console.error('Post update error', err);
    }
  }

  async deletePost(id: number): Promise<Post> {
    try {
      const options: FindOneOptions<Post> = {
        where: { id },
      };
      const post = await this.postRepository.findOne(options);

      if (!post) {
        throw new NotFoundException(`Post with ID ${id} not found`);
      }

      return await this.postRepository.remove(post);
    } catch (err) {
      console.error('Post deletePost error', err);
    }
  }
}
