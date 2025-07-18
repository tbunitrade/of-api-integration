import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePostFileFkCascade1689781234569 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post_file DROP CONSTRAINT post_file_post_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post_file
      ADD CONSTRAINT post_file_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post_file DROP CONSTRAINT post_file_post_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post_file
      ADD CONSTRAINT post_file_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES post(id)
    `);
  }
}
