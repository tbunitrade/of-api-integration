// backend/of-software/src/automate/utils/post-queue.service.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { PostQueueEntity} from "../entities/post-queue.entity";
import { PostFileService} from "../../postFile/post_file.service";
import { PostCaptionService} from "../../postCaption/post_caption.service";


@Injectable()
export class PostQueueService {
  constructor(
    @InjectRepository( PostQueueEntity )
    private readonly queueRepo: Repository<PostQueueEntity>,
    private readonly postFileService: PostFileService,
    private readonly postCaptionService: PostCaptionService
  ) {}

  /**
   * Находим очередь по (modelPlatformId, postId)
   * или создаём новую.
   */
  async getOrCreate(
    modelPlatformId: number,
    postId: number,
    //totalCaptions: number,
    //totalFiles: number,
  ): Promise<PostQueueEntity> {
    let queue = await this.queueRepo.findOne({
      where: {
        model_platform_id: modelPlatformId,
        post_id: postId,
      },
    });

    if (!queue) {
      queue = this.queueRepo.create({
        model_platform_id: modelPlatformId,
        post_id: postId,
        caption_index: 0,
        file_index: 0,
        used_count: 0,
        total_captions: 0,
        total_files: 0,
      });

      queue = await this.queueRepo.save(queue);

    }
    // else {
    //   // Если вдруг поменялось количество caption/file — обновим
    //   let changed = false;
    //
    //   if (queue.total_captions !== totalCaptions) {
    //     queue.total_captions = totalCaptions;
    //     changed = true;
    //   }
    //
    //   if (queue.total_files !== totalFiles) {
    //     queue.total_files = totalFiles;
    //     changed = true;
    //   }
    //
    //   if (changed) {
    //     queue = await this.queueRepo.save(queue);
    //   }
    // }

    return queue;
  }

  async recalculate( modelPlatformId: number, postId: number ) {
    const queue = await this.getOrCreate(modelPlatformId, postId);

    const files = await this.postFileService.findByPostId(postId);
    const captions = await this.postCaptionService.findByPostId(postId);

    queue.total_files = files.length;
    queue.total_captions = captions.length;

    // мягкий reset
    // if (queue.file_index >= queue.total_files) queue.file_index = 0;
    // if (queue.caption_index >= queue.total_captions) queue.caption_index = 0;

    // обновленный мягкий reset
    if (queue.file_index >= queue.total_files && queue.total_files > 0) {
      queue.file_index = 0;
    }

    if (queue.caption_index >= queue.total_captions && queue.total_captions > 0) {
      queue.caption_index = 0;
    }

    return this.queueRepo.save(queue);
  }

  /**
   * Получить следующее значение очереди (по кругу):
   * - возвращаем индексы, которые надо использовать СЕЙЧАС
   * - внутри сразу сдвигаем указатели и сохраняем
   */
  async getNext(
    modelPlatformId: number,
    postId: number,
    //totalCaptions: number,
    //totalFiles: number,
  ): Promise<{
    queue: PostQueueEntity;
    captionIndex: number;
    fileIndex: number;
  }> {
    //const safeTotalCaptions = Math.max(totalCaptions, 1);
    //const safeTotalFiles = Math.max(totalFiles, 1);

    let queue = await this.getOrCreate(
      modelPlatformId,
      postId,
      //safeTotalCaptions,
      //safeTotalFiles,
    );

    // защитные значения
    const totalCaptions = Math.max(queue.total_captions, 1);
    const totalFiles = Math.max(queue.total_files, 1);

    const captionIndex = queue.caption_index;
    const fileIndex = queue.file_index;

    // const nextCaptionIndex =
    //   safeTotalCaptions > 0
    //     ? (captionIndex + 1) % safeTotalCaptions
    //     : 0;
    //
    // const nextFileIndex =
    //   safeTotalFiles > 0
    //     ? (fileIndex + 1) % safeTotalFiles
    //     : 0;
    //
    queue.caption_index = (captionIndex + 1) % totalCaptions;
    queue.file_index = (fileIndex + 1) % totalFiles;
    //queue.used_count++;
    queue.used_count = (queue.used_count || 0) + 1;
    //await this.queueRepo.save(queue);
    queue = await this.queueRepo.save(queue);

    return {
      queue,
      captionIndex,
      fileIndex,
    };
  }

  /**
   * Просто вернуть очередь (например для Vue UI)
   */

  async getProgress(modelPlatformId: number, postId: number) {
    return this.queueRepo.findOne({
      where: {
        model_platform_id: modelPlatformId,
        post_id: postId,
      },
    });
  }

  /**
   * Теоретический reset, если вдруг нужно обнулить индексы.
   * Сейчас фактически не обязателен (мы и так крутим по модулю),
   * но пусть будет.
   */
  async resetIfRequired(modelPlatformId: number, postId: number) {
    const queue = await this.queueRepo.findOne({
      where: {
        model_platform_id: modelPlatformId,
        post_id: postId,
      },
    });

    if (!queue) return;

    const totalCaptions = queue.total_captions;
    const totalFiles = queue.total_files;

    let changed = false;

    if (totalCaptions > 0 && queue.caption_index >= totalCaptions) {
      queue.caption_index = 0;
      changed = true;
    }

    if (totalFiles > 0 && queue.file_index >= totalFiles) {
      queue.file_index = 0;
      changed = true;
    }

    if (changed) {
      await this.queueRepo.save(queue);
    }
  }
}
