import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";
export class InitPlatformSeed1749400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем платформу onlyfans, если ее нет
    await queryRunner.query(`
      INSERT INTO platform (name, created_at, updated_at)
      SELECT 'onlyfans', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM platform WHERE name = 'onlyfans');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Опционально удалить платформу
    await queryRunner.query(`DELETE FROM platform WHERE name = 'onlyfans';`);
  }
}
