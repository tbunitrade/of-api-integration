import { MigrationInterface, QueryRunner } from "typeorm";

export class Initdump implements MigrationInterface {
  name = 'Initdump'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "model_platform" (
                "id" SERIAL NOT NULL,
                "model_id" integer NOT NULL,
                "platform_id" integer NOT NULL,
                "post_id" integer,
                "username" character varying,
                "password" character varying,
                "site_url" character varying,
                "number_of_days" integer NOT NULL DEFAULT 0,
                "prokey" character varying,
                "scheduled_date" character varying,
                "latest_group_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_model_platform" PRIMARY KEY ("model_id", "platform_id"),
                CONSTRAINT "UQ_model_platform_post_id" UNIQUE ("post_id")
            );
        `);

    await queryRunner.query(`
            CREATE TABLE "platform_group" (
                "id" SERIAL NOT NULL,
                "platform_id" integer NOT NULL,
                "group_id" integer NOT NULL,
                "status" integer NOT NULL DEFAULT 1,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_platform_group" PRIMARY KEY ("platform_id", "group_id")
            );
        `);

    await queryRunner.query(`
            CREATE TABLE "group_message" (
                "id" SERIAL NOT NULL,
                "group_id" integer NOT NULL,
                "message_id" integer NOT NULL,
                "status" integer NOT NULL DEFAULT 1,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_group_message" PRIMARY KEY ("group_id", "message_id")
            );
        `);

    await queryRunner.query(`CREATE INDEX "IDX_model_id" ON "model_platform" ("model_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_platform_id" ON "model_platform" ("platform_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_pg_platform_id" ON "platform_group" ("platform_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_pg_group_id" ON "platform_group" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_gm_group_id" ON "group_message" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_gm_message_id" ON "group_message" ("message_id")`);

    await queryRunner.query(`
            ALTER TABLE "model_platform"
            ADD CONSTRAINT "FK_model_platform_post" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "model_platform" DROP CONSTRAINT "FK_model_platform_post"`);

    await queryRunner.query(`DROP INDEX "IDX_gm_message_id"`);
    await queryRunner.query(`DROP INDEX "IDX_gm_group_id"`);
    await queryRunner.query(`DROP INDEX "IDX_pg_group_id"`);
    await queryRunner.query(`DROP INDEX "IDX_pg_platform_id"`);
    await queryRunner.query(`DROP INDEX "IDX_platform_id"`);
    await queryRunner.query(`DROP INDEX "IDX_model_id"`);

    await queryRunner.query(`DROP TABLE "group_message"`);
    await queryRunner.query(`DROP TABLE "platform_group"`);
    await queryRunner.query(`DROP TABLE "model_platform"`);
  }
}
