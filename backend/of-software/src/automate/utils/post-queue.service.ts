// backend/of-software/src/automate/utils/post-queue.service.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PostQueueEntity} from "../entities/post-queue.entity";

//import { PostCaption } from "../../postCaption/post_caption.entity";
//import { PostFile } from "../../postFile/post_file.entity";
//import { ModelPlatform} from "../../modelPlatform/model_platform.entity";

@Injectable()
export class PostQueueService {
  constructor(
    @InjectRepository( PostQueueEntity )
    private readonly captionRepo: Repository<PostQueueEntity>,
  ) {}

  /**
   * Найти или создать очередь для (model_platform_id + post_id)
   */
  async getOrCreate(
    modelPlatformId: number,
    postId: number,
    totalCaptions: number,
    totalFiles: number,
  ): Promise<PostQueueEntity> {
    let queue = await this.captionRepo.findOne({
      where: {
        model_platform_id: modelPlatformId,
        post_id: postId,
      },
    });

    if (!queue) {
      queue = this.captionRepo.create({
        model_platform_id: modelPlatformId,
        post_id: postId,
        caption_index: 0,
        file_index: 0,
        used_count: 0,
        total_captions: totalCaptions,
        total_files: totalFiles,
      });

      queue = await this.captionRepo.save(queue);
    } else {
      // Если вдруг поменялось количество caption/file — обновим
      let changed = false;

      if (queue.total_captions !== totalCaptions) {
        queue.total_captions = totalCaptions;
        changed = true;
      }

      if (queue.total_files !== totalFiles) {
        queue.total_files = totalFiles;
        changed = true;
      }

      if (changed) {
        queue = await this.captionRepo.save(queue);
      }
    }

    return queue;
  }

  /**
   * Получить следующее значение очереди (по кругу):
   * - возвращаем индексы, которые надо использовать СЕЙЧАС
   * - внутри сразу сдвигаем указатели и сохраняем
   */
  async getNext(
    modelPlatformId: number,
    postId: number,
    totalCaptions: number,
    totalFiles: number,
  ): Promise<{
    queue: PostQueueEntity;
    captionIndex: number;
    fileIndex: number;
  }> {
    const safeTotalCaptions = Math.max(totalCaptions, 1);
    const safeTotalFiles = Math.max(totalFiles, 1);

    let queue = await this.getOrCreate(
      modelPlatformId,
      postId,
      safeTotalCaptions,
      safeTotalFiles,
    );

    const captionIndex = queue.caption_index ?? 0;
    const fileIndex = queue.file_index ?? 0;

    const nextCaptionIndex =
      safeTotalCaptions > 0
        ? (captionIndex + 1) % safeTotalCaptions
        : 0;

    const nextFileIndex =
      safeTotalFiles > 0
        ? (fileIndex + 1) % safeTotalFiles
        : 0;

    queue.caption_index = nextCaptionIndex;
    queue.file_index = nextFileIndex;
    queue.used_count = (queue.used_count || 0) + 1;

    queue = await this.captionRepo.save(queue);

    return {
      queue,
      captionIndex,
      fileIndex,
    };
  }

  /**
   * Теоретический reset, если вдруг нужно обнулить индексы.
   * Сейчас фактически не обязателен (мы и так крутим по модулю),
   * но пусть будет.
   */
  async resetIfRequired(
    modelPlatformId: number,
    postId: number,
  ): Promise<void> {
    const queue = await this.captionRepo.findOne({
      where: {
        model_platform_id: modelPlatformId,
        post_id: postId,
      },
    });

    if (!queue) return;

    const totalCaptions = queue.total_captions || 0;
    const totalFiles = queue.total_files || 0;

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
      await this.captionRepo.save(queue);
    }
  }

  /**
   * Для Vue-админки: можно показать прогресс по каждой модели/посту
   */
  async getProgress(
    modelPlatformId: number,
    postId: number,
  ): Promise<PostQueueEntity | null> {
    return this.captionRepo.findOne({
      where: {
        model_platform_id: modelPlatformId,
        post_id: postId,
      },
    });
  }

}


// async getNext( modelPlatformId: number , postId: number)
// {
//   // 1) Загружаем caption по порядку
//   const captions = await this.captionRepo.find({
//     where: { post_id: postId, status: 1 },
//     order: { id: "ASC"}
//   });
//
//   // 2) Загружаем файлы
//   const files = await this.fileRepo.find({
//     where: { post_id: postId, status: 1 },
//     order: { id: "ASC"}
//   });
//
//   // 3) Получаем последний успешный пост
//   const last = await this.logRepo.findOne({
//     where: {
//       model_platform_id : modelPlatformId,
//       post_id : postId,
//       status : 'success'
//     },
//
//     order: { id : 'DESC' }
//   });
//
//   let captionIndex = 0;
//   let fileIndex = 0;
//
//   if (last?.notes) {
//     try {
//       const obj = JSON.parse(last.notes);
//       captionIndex = obj.captionIndex + 1;
//       fileIndex = obj.fileIndex + 1;
//     } catch {}
//   }
//
//   // круговой режим
//
//   if ( captionIndex >= captions.length ) captionIndex = 0;
//   if ( fileIndex >= files.length ) fileIndex =0;
//
//   const caption = captions[ captionIndex ];
//   const file = files[ fileIndex ];
//
//   return {
//     caption,
//     file,
//     captionIndex,
//     fileIndex
//   };
// }
//
// async markSuccess( modelPlatformId : number, postId: number, captionIndex: number, fileIndex: number, captionId: number, fileId: number )
// {
//   const notes = JSON.stringify({
//     captionId,
//     fileId,
//     captionIndex,
//     fileIndex
//   });
//
//   await  this.logRepo.insert({
//     model_platform_id : modelPlatformId,
//     post_id : postId,
//     status : 'success',
//     notes
//   });
// }
