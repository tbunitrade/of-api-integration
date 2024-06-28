import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { PostCaption } from './post_caption.entity';
import { PostCaptionDto } from 'src/dtos/post-caption.dto';

@Injectable()
export class PostCaptionService {
  constructor(
    @InjectRepository(PostCaption)
    private readonly postCaptionRepository: Repository<PostCaption>,
  ) {}

  async findAll(): Promise<PostCaption[]> {
    try {
      return await this.postCaptionRepository.find();
    } catch (err) {
      console.error('PostCaption findAll error', err);
    }
  }

  async findById(id: number): Promise<PostCaption> {
    try {
      const options: FindOneOptions<PostCaption> = {
        where: { id },
      };
      return this.postCaptionRepository.findOne(options);
    } catch (err) {
      console.error('PostCaption findById error', err);
    }
  }

  async create(postCaption: PostCaptionDto): Promise<PostCaption> {
    try {
      const newPostCaption = this.postCaptionRepository.create(postCaption);
      const result = await this.postCaptionRepository.save(newPostCaption);
      const _result = this.findById(result.id);
      return _result;
    } catch (err) {
      console.error('PostTime create error', err);
    }
  }

  async update(
    id: number,
    updatePostCaption: Partial<PostCaption>,
  ): Promise<PostCaption> {
    try {
      const options: FindOneOptions<PostCaption> = {
        where: { id },
      };
      const postCaption = await this.postCaptionRepository.findOne(options);

      if (!postCaption) {
        throw new NotFoundException(`PostCaption with ID ${id} not found`);
      }
      const data = {
        ...postCaption,
        ...updatePostCaption,
      };
      const updatedPost = await this.postCaptionRepository.save(data);

      return updatedPost;
    } catch (err) {
      console.error('PostCaption update error', err);
    }
  }

  async deletePostCaption(id: number): Promise<PostCaption> {
    try {
      const options: FindOneOptions<PostCaption> = {
        where: { id },
      };
      const post = await this.postCaptionRepository.findOne(options);

      if (!post) {
        throw new NotFoundException(`PostCaption with ID ${id} not found`);
      }

      return await this.postCaptionRepository.remove(post);
    } catch (err) {
      console.error('PostCaption deletePostCaption error', err);
    }
  }
}
