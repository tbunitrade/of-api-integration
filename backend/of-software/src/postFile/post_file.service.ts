import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { PostFile } from './post_file.entity';
import { PostFileDto } from 'src/dtos/post-file.dto';

@Injectable()
export class PostFileService {
  constructor(
    @InjectRepository(PostFile)
    private readonly postFileRepository: Repository<PostFile>,
  ) {}

  async findAll(): Promise<PostFile[]> {
    try {
      return await this.postFileRepository.find();
    } catch (err) {
      console.error('PostFile findAll error', err);
    }
  }

  async findById(id: number): Promise<PostFile> {
    try {
      const options: FindOneOptions<PostFile> = {
        where: { id },
      };
      return this.postFileRepository.findOne(options);
    } catch (err) {
      console.error('PostFile findById error', err);
    }
  }

  async findByPostId(post_id: number): Promise<PostFile[]> {
    try {
      const postFileOptions: FindOneOptions<PostFile> = {
        where: { post_id },
      };
      const postFiles = await this.postFileRepository.find(postFileOptions);
      if (!postFiles) {
        throw new NotFoundException(
          `PostFiles with Model_Platform_ID:${post_id} not found`,
        );
      }
      return postFiles;
    } catch (err) {
      console.error('Post findById error', err);
      throw err;
    }
  }

  async create(postFile: PostFileDto): Promise<PostFile> {
    // try {
    const { post_id, url } = postFile;
    // const urls = Array.isArray(url) ? url : [url];
    // const postFileEntities: PostFileDto[] = [];
    // urls.map(async (u: string) => {
    //   const newPostFile: PostFileDto = {
    //     post_id: post_id,
    //     url: u,
    //   };
    //   postFileEntities.push(newPostFile);
    // });
    const existingPostFile = await this.postFileRepository.findOne({
      where: { post_id, url },
    });
    if (existingPostFile) {
      throw new ConflictException('PostFile already exists');
    }
    const newPostFile = this.postFileRepository.create(postFile);
    const result = await this.postFileRepository.save(newPostFile);
    const _result = this.findById(result.id);
    return _result;
    // } catch (err) {
    //   console.error('PostFile create error', err);
    // }
  }

  async deletePostFile(id: number): Promise<PostFile> {
    try {
      const options: FindOneOptions<PostFile> = {
        where: { id },
      };
      const post = await this.postFileRepository.findOne(options);

      if (!post) {
        throw new NotFoundException(`PostFile with ID ${id} not found`);
      }

      return await this.postFileRepository.remove(post);
    } catch (err) {
      console.error('PostFile deletePostFile error', err);
    }
  }
}
