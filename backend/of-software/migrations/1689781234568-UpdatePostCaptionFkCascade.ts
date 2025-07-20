import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePostCaptionFkCascade1689781234568 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post_caption DROP CONSTRAINT post_caption_post_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post_caption
      ADD CONSTRAINT post_caption_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE post_caption DROP CONSTRAINT post_caption_post_id_fkey`);
    await queryRunner.query(`
      ALTER TABLE post_caption
      ADD CONSTRAINT post_caption_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES post(id)
    `);
  }
}
