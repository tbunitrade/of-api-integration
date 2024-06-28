import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostTime } from './post_time.entity';
import { FindOneOptions, Repository } from 'typeorm';
import { PostTimeDto } from 'src/dtos/post-time.dto';

@Injectable()
export class PostTimeService {
  constructor(
    @InjectRepository(PostTime)
    private readonly postTimeRepository: Repository<PostTime>,
  ) {}

  async findAll(rel: boolean = true): Promise<PostTime[]> {
    // try {
    return await this.postTimeRepository.find(
      rel ? { relations: ['captions'] } : {},
    );
    // } catch (err) {
    //   console.error('PostTime findAll error', err);
    // }
  }

  async findById(id: number): Promise<PostTime> {
    // try {
    const options: FindOneOptions<PostTime> = {
      where: { id },
      relations: ['captions'],
    };
    return this.postTimeRepository.findOne(options);
    // } catch (err) {
    //   console.error('PostTime findById error', err);
    // }
  }

  async findAllByModelPlatform(
    model_id: number,
    platform_id: number,
  ): Promise<any> {
    // try {
    const result = await this.postTimeRepository
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
      .orderBy('group.order')
      .addOrderBy('group.id')
      .getMany();
    return result;
    // } catch (err) {
    //   console.error('Group findAll error', err);
    // }
  }

  async create(postTime: PostTimeDto): Promise<PostTime> {
    // try {
    const { post_id, time } = postTime;
    const existingPostTime = await this.postTimeRepository.findOne({
      where: { post_id, time },
    });
    if (existingPostTime) {
      throw new ConflictException('PostTime already exists');
    }
    const newPostTime = this.postTimeRepository.create(postTime);
    const result = await this.postTimeRepository.save(newPostTime);
    const _result = this.findById(result.id);
    return _result;
    // } catch (err) {
    //   console.error('PostTime create error', err);
    // }
  }

  async update(
    id: number,
    updatePostTime: Partial<PostTime>,
  ): Promise<PostTime> {
    // try {
    const options: FindOneOptions<PostTime> = {
      where: { id },
    };
    const post = await this.postTimeRepository.findOne(options);

    if (!post) {
      throw new NotFoundException(`PostTime with ID ${id} not found`);
    }
    const data = {
      ...post,
      ...updatePostTime,
    };
    const updatedPost = await this.postTimeRepository.save(data);

    return updatedPost;
    // } catch (err) {
    //   console.error('PostTime update error', err);
    // }
  }

  async deletePostTime(id: number): Promise<PostTime> {
    // try {
    const options: FindOneOptions<PostTime> = {
      where: { id },
    };
    const post = await this.postTimeRepository.findOne(options);

    if (!post) {
      throw new NotFoundException(`PostTime with ID ${id} not found`);
    }

    return await this.postTimeRepository.remove(post);
    // } catch (err) {
    //   console.error('PostTime deletePost error', err);
    // }
  }

  async getPostCaptionForPostTime(post_time_id: number): Promise<PostTime> {
    const options: FindOneOptions<PostTime> = {
      where: { id: post_time_id },
      relations: ['captions'],
    };
    return await this.postTimeRepository.findOne(options);
  }
}
