import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PostQueueService } from '../src/automate/utils/post-queue.service';
import { PostQueueEntity } from '../src/automate/entities/post-queue.entity';

describe('PostQueueService', () => {
  let service: PostQueueService;
  let repo: Repository<PostQueueEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostQueueService,
        {
          provide: getRepositoryToken(PostQueueEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<PostQueueService>(PostQueueService);
    repo = module.get<Repository<PostQueueEntity>>(getRepositoryToken(PostQueueEntity));
  });

  it('should create queue if not exists', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue(null);
    jest.spyOn(repo, 'save').mockImplementation((q) => Promise.resolve(q));

    const result = await service.getOrCreate(1, 10, 5, 5);

    expect(result.caption_index).toBe(0);
    expect(result.file_index).toBe(0);
    expect(result.total_captions).toBe(5);
    expect(result.total_files).toBe(5);
  });

  it('should update totals if changed', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      model_platform_id: 1,
      post_id: 10,
      caption_index: 0,
      file_index: 0,
      used_count: 0,
      total_captions: 100,
      total_files: 200,
    } as any);

    const saveSpy = jest.spyOn(repo, 'save').mockImplementation((q) => Promise.resolve(q));

    const result = await service.getOrCreate(1, 10, 50, 20);

    expect(saveSpy).toHaveBeenCalled();
    expect(result.total_captions).toBe(50);
    expect(result.total_files).toBe(20);
  });

  it('getNext should rotate indexes', async () => {
    jest.spyOn(service, 'getOrCreate').mockResolvedValue({
      model_platform_id: 1,
      post_id: 10,
      caption_index: 2,
      file_index: 1,
      used_count: 0,
      total_captions: 5,
      total_files: 3,
    } as any);

    jest.spyOn(repo, 'save').mockImplementation((q) => Promise.resolve(q));

    const { captionIndex, fileIndex, queue } = await service.getNext(1, 10, 5, 3);

    expect(captionIndex).toBe(2);
    expect(fileIndex).toBe(1);
    expect(queue.caption_index).toBe(3);
    expect(queue.file_index).toBe(2);
  });

  it('resetIfRequired should reset overflow', async () => {
    jest.spyOn(repo, 'findOne').mockResolvedValue({
      caption_index: 10,
      file_index: 8,
      total_captions: 5,
      total_files: 3,
    } as any);

    const saveSpy = jest.spyOn(repo, 'save').mockImplementation((q) => Promise.resolve(q));

    await service.resetIfRequired(1, 10);

    expect(saveSpy).toHaveBeenCalledWith({
      caption_index: 0,
      file_index: 0,
      total_captions: 5,
      total_files: 3,
    });
  });
});
