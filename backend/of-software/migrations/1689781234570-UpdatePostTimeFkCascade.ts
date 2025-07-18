import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePostTimeFkCascade1689781234570 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post_time DROP CONSTRAINT post_time_post_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post_time
      ADD CONSTRAINT post_time_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post_time DROP CONSTRAINT post_time_post_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post_time
      ADD CONSTRAINT post_time_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES post(id)
    `);
  }
}
