import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePostModelPlatformFkCascade implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post DROP CONSTRAINT post_model_platform_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post
      ADD CONSTRAINT post_model_platform_id_fkey
      FOREIGN KEY (model_platform_id) REFERENCES model_platform(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post DROP CONSTRAINT post_model_platform_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post
      ADD CONSTRAINT post_model_platform_id_fkey
      FOREIGN KEY (model_platform_id) REFERENCES model_platform(id)
    `);
  }
}
