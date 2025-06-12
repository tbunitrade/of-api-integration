import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";
//https://github.com/VIPineapples/OF-Software/blob/main/backend/of-software/migrations/1741959395889-SeedAdminAndSupport.ts
export class SeedSuperAdmin1749400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = 'jcosta@costaindustries.com';

    // Проверяем, есть ли уже такой юзер
    const userExists = await queryRunner.query(
      `SELECT 1 FROM "user" WHERE email = $1`,
      [email]
    );

    if (userExists.length === 0) {
      const passwordHash = await bcrypt.hash('abcd1234', 10);

      await queryRunner.query(
        `INSERT INTO "user" (email, password, "firstName", "lastName", "prokey") VALUES ($1, $2, $3, $4, $5)`,
        [email, passwordHash, 'John', 'Costa', '']
      );

      console.log('Super admin user created');
    } else {
      console.log('Super admin user already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Не удаляем супер-админа при откате, но можно добавить если нужно
  }
}
