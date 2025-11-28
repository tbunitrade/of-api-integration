// backend/of-software/src/automate/utils/post-queue.service.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PostFile} from "../../postFile/post_file.entity";
import { Post } from "src/post/post.entity";

import { PostQueueEntity } from "../entities/post-queue.entity";
//import { PostFileService } from "../../postFile/post_file.service";
import { PostCaptionService } from "../../postCaption/post_caption.service";


@Injectable()
export class PostQueueService {
  constructor(
    @InjectRepository( PostQueueEntity )
    private readonly queueRepo: Repository<PostQueueEntity>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostFile)
    //private readonly postFileService: PostFileService,
    private readonly postFileRepository: Repository<PostFile>,
    private readonly postCaptionService: PostCaptionService,
  ) {}

  // post-queue.service.ts

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
  ): Promise<{
    queue: PostQueueEntity;
    captionIndex: number;
    fileIndex: number;
  }> {
    let queue = await this.getOrCreate(
      modelPlatformId,
      postId,
    );

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )

    if ( !queue.updated_at || queue.updated_at < startOfToday ) {
      // новый день для данной пары (modelPlatformId, postId)
      queue.used_count = 0;
    }

    // 2️⃣ Синхронизация total_captions / total_files с реальными данными в БД
    const [ captions, filesCount ] = await Promise.all([
      this.postCaptionService.findByPostId(postId),        // <- уже есть в сервисе
      this.postFileRepository.count({ where: { post_id: postId } }),
    ]);

    queue.total_captions = captions.length;
    queue.total_files = filesCount;

    // 3️⃣ Циклическая “по достижению” очистка индексов

    if ( queue.total_captions > 0 && queue.caption_index >= queue.total_captions){
      queue.caption_index = 0;
    }

    if ( queue.total_files >0 && queue.file_index >= queue.total_files ){
      queue.file_index = 0;
    }

    // Защитные значения на случай отсутствия файлов/капшнов
    const totalCaptions = Math.max(queue.total_captions, 1);
    const totalFiles = Math.max(queue.total_files, 1);

    // Текущие индексы, которые будут использованы СЕЙЧАС
    const captionIndex = queue.caption_index;
    const fileIndex = queue.file_index;

    // Сдвигаем по кругу на следующий
    queue.caption_index = (captionIndex + 1) % totalCaptions;
    queue.file_index = (fileIndex + 1) % totalFiles;

    // Увеличиваем счётчик использований за день
    queue.used_count = (queue.used_count || 0) + 1;

    // Обновляем updated_at
    queue.updated_at = new Date();

    queue = await this.queueRepo.save(queue);

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
