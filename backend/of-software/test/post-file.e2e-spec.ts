import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest'; // изменяем на default import
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostFile } from '../src/postFile/post_file.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises'; // Замокаем fs для удаления файла
import { jest } from '@jest/globals';
import axios from 'axios'; // добавляем axios

// Мокаем fs.unlink, чтобы не удалять реальные файлы
jest.mock('fs/promises');

// Мокаем axios
jest.mock('axios'); // Мокаем axios полностью, а не только get

describe('PostFileController (e2e)', () => {
  let app: INestApplication;
  let repository: Repository<PostFile>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    repository = moduleFixture.get<Repository<PostFile>>(getRepositoryToken(PostFile));
    await app.init();
  });

  it('should delete a file and its record', async () => {
    const fileId = 1; // ID файла, который хотим удалить
    const fileUrl = 'path/to/file.jpg'; // Путь к файлу для удаления

    // Мокаем удаление записи из базы данных
    const deleteSpy = jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: [] });

    // Мокаем успешное удаление файла с диска
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    // Мокаем успешное удаление файла с сервера
    (axios.get as jest.Mock).mockResolvedValue({ data: true });

    // Отправляем запрос на удаление
    const response = await request(app.getHttpServer())
      .delete(`/post_file/${fileId}`)
      .query({ file: fileUrl })
      .expect(200);

    // Проверяем, что ответ успешный и что данные были удалены
    expect(response.body.message).toBe('File deleted successfully');
    expect(deleteSpy).toHaveBeenCalledWith(fileId); // Проверяем, что запись удалена из базы
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining(fileUrl)); // Проверяем, что файл был удален с диска
    expect(axios.get).toHaveBeenCalledWith(`upload/delete?file=${fileUrl}`); // Проверяем, что файл был удален с сервера
  });

  it('should return error if file is not found', async () => {
    const fileId = 999; // Не существующий файл
    const fileUrl = 'non-existing-file.jpg';

    // Мокаем отсутствие записи в базе данных
    jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 0, raw: [] });

    // Мокаем успешное удаление файла с диска
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    // Мокаем успешное удаление файла с сервера
    (axios.get as jest.Mock).mockResolvedValue({ data: true });

    // Отправляем запрос на удаление
    const response = await request(app.getHttpServer())
      .delete(`/post_file/${fileId}`)
      .query({ file: fileUrl })
      .expect(404);

    // Проверяем, что сервер отдает ошибку
    expect(response.body.message).toBe('File not found');
  });
});
