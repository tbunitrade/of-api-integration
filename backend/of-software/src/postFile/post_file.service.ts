import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { In } from 'typeorm'; // 👈 как просил — отдельная строка

import { PostFile } from './post_file.entity';
import { PostFileDto } from 'src/dtos/post-file.dto';

import * as fs from 'fs/promises';
import * as path from 'path';

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
    const { post_id, url } = postFile;

    const existingPostFile = await this.postFileRepository.findOne({
      where: { post_id, url },
    });

    if (existingPostFile) {
      throw new ConflictException('PostFile already exists');
    }

    const newPostFile = this.postFileRepository.create(postFile);
    const result = await this.postFileRepository.save(newPostFile);

    return await this.findById(result.id);
  }

  //async deletePostFile(id: number, fileUrl?: string): Promise<PostFile> {
  async deletePostFile(id: number, fileUrl?: string): Promise<{id: number; url: string; deleted: boolean}> {
    try {
      const post = await this.postFileRepository.findOne({ where: { id } });

      if (!post) {
        console.warn(`⚠️ [deletePostFile] PostFile ID:${id} not found in DB`);
        throw new NotFoundException(`PostFile with ID ${id} not found`);
      }


      const deletedId = post.id;
      const deletedUrl = post.url;
      const targetUrl = fileUrl || post.url;
      const timestamp = new Date().toISOString();

      console.log(`📋 [${timestamp}] Deleting PostFile ID:${deletedId}, URL:${deletedUrl}`);

      if (targetUrl) {
        const filePath = path.resolve('uploads', path.basename(targetUrl));
        try {
          await fs.access(filePath); // check if file exists
          await fs.unlink(filePath);
          console.log(`🧹 Deleted file: ${filePath}`);
          console.log(`🧹 [${timestamp}] File deleted from disk: ${filePath}`);
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.warn(`⚠️ File not found (already deleted?): ${filePath}`);
            console.warn(`⚠️ [${timestamp}] File not found (already deleted?): ${filePath}`);
          } else {
            console.warn(`⚠️ Could not delete file: ${filePath}`, err.message);
            console.error(`❌ [${timestamp}] Error deleting file: ${filePath}`, err.message);
          }
        }
      }
      //return
      await this.postFileRepository.remove(post);
      console.log(`✅ [${timestamp}] PostFile ID:${deletedId} removed from DB`);
      return {
        id: deletedId,
        url: deletedUrl,
        deleted: true,
      };

      //return post; //Возвращаем ДО удаления
    } catch (err) {
      console.error('PostFile deletePostFile error', err);
      throw err; // <-- иначе фронт может застрять в спиннере
    }
  }

  async deleteMany(ids: number[]): Promise<number[]> {
    const timestamp = new Date().toISOString();

    try {
      console.log(`📋 [${timestamp}] Deleting multiple PostFiles: ${ids.join(', ')}`);

      const filesToDelete = await this.postFileRepository.findBy({
        id: In(ids),
      });

      if (!filesToDelete.length) {
        console.warn('[⚠️ deleteMany] No files found for deletion.');
        console.warn(`⚠️ [${timestamp}] No PostFiles found for provided IDs.`);
        return [];
      }

      const deletedIds = filesToDelete.map((f) => f.id); // ✅ сохраняем ДО удаления

      for (const file of filesToDelete) {
        if (file.url) {
          console.log('File file.url- ', file.url);

          const filePath = path.resolve('uploads', path.basename(file.url)); // ⬅️ скорректируй если другой путь
          try {
            await fs.access(filePath); // check if file exists
            await fs.unlink(filePath);
            console.log(`🧹 Deleted file: ${filePath}`);
          } catch (err) {
            if (err.code === 'ENOENT') {
              console.warn(`⚠️ File not found (already deleted?): ${filePath}`);
            } else {
              console.warn(`⚠️ Failed to delete file: ${filePath}`, err.message);
            }
          }
        }
      }

      await this.postFileRepository.remove(filesToDelete);
//      return filesToDelete.map((f) => f.id);
      console.log('We delete this ', filesToDelete , ' ID ' ,deletedIds);;
      return deletedIds; // ✅ теперь возвращаем корректный список ID


    } catch (err) {
      console.error('❌ deleteMany error', err);
      throw err;
    }
  }
}
