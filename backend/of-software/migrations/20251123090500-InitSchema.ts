import { MigrationInterface, QueryRunner, Table, TableUnique } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class InitSchema20251123090500 implements MigrationInterface {
  name = 'InitSchema20251123090500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========= БАЗОВЫЕ ТАБЛИЦЫ (из InitSchema1749140000000) =========

    // USER
    await queryRunner.query(`
      CREATE TABLE public."user" (
        id SERIAL PRIMARY KEY,
        "firstName" VARCHAR,
        "lastName" VARCHAR,
        photo VARCHAR,
        email VARCHAR NOT NULL UNIQUE,
        password VARCHAR NOT NULL,
        prokey VARCHAR
      );
    `);

    // MODEL
    await queryRunner.query(`
      CREATE TABLE public.model (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        photo VARCHAR,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // PLATFORM
    await queryRunner.query(`
      CREATE TABLE public.platform (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // MODEL_PLATFORM (+ fingerprint_username, prokey и пр.)
    await queryRunner.query(`
      CREATE TABLE public.model_platform (
        id SERIAL PRIMARY KEY,
        model_id INTEGER NOT NULL REFERENCES public.model(id),
        platform_id INTEGER NOT NULL REFERENCES public.platform(id),
        post_id INTEGER UNIQUE,
        username VARCHAR,
        password VARCHAR,
        site_url VARCHAR,
        number_of_days INTEGER DEFAULT 0 NOT NULL,
        scheduled_date VARCHAR,
        latest_group_id INTEGER,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        prokey VARCHAR,
        fingerprint_username VARCHAR,
        ofid_username VARCHAR
      );
    `);

    // GROUP
    await queryRunner.query(`
      CREATE TABLE public."group" (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        model_id INTEGER NOT NULL,
        added_on_platform_at TIMESTAMP DEFAULT now(),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        "order" INTEGER
      );
    `);

    // MESSAGE
    await queryRunner.query(`
      CREATE TABLE public.message (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        message_time TIME DEFAULT now(),
        price DOUBLE PRECISION,
        message_list VARCHAR NOT NULL,
        message VARCHAR,
        message_exclude_list VARCHAR,
        content VARCHAR,
        content_attached BOOLEAN DEFAULT false NOT NULL,
        release_form_tags VARCHAR,
        release_user_tags VARCHAR,
        free_preview INTEGER,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // GROUP_MESSAGE
    await queryRunner.query(`
      CREATE TABLE public.group_message (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES public."group"(id),
        message_id INTEGER NOT NULL REFERENCES public.message(id),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // PLATFORM_GROUP
    await queryRunner.query(`
      CREATE TABLE public.platform_group (
        id SERIAL PRIMARY KEY,
        platform_id INTEGER NOT NULL REFERENCES public.platform(id),
        group_id INTEGER NOT NULL REFERENCES public."group"(id),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // POST
    await queryRunner.query(`
      CREATE TABLE public.post (
        id SERIAL PRIMARY KEY,
        model_platform_id INTEGER NOT NULL REFERENCES public.model_platform(id) ON DELETE CASCADE,
        number_of_days INTEGER DEFAULT 0 NOT NULL,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        scheduled_date VARCHAR,
        user_tags VARCHAR,
        form_tags VARCHAR
      );
    `);

    // POST_CAPTION
    await queryRunner.query(`
      CREATE TABLE public.post_caption (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES public.post(id),
        caption VARCHAR NOT NULL,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // POST_FILE
    await queryRunner.query(`
      CREATE TABLE public.post_file (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES public.post(id),
        url VARCHAR,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // POST_TIME
    await queryRunner.query(`
      CREATE TABLE public.post_time (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES public.post(id),
        "time" TIME DEFAULT now(),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    // ========= ЛОГИ И ЛИМИТЫ (из AddModelLogsAndLimits) =========

    await queryRunner.createTable(
      new Table({
        name: 'model_status_log_entity',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'model_platform_id', type: 'integer', isNullable: false },
          { name: 'type', type: 'varchar', isNullable: false },
          { name: 'step', type: 'varchar', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false },
          { name: 'message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'model_daily_limit_entity',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'model_platform_id', type: 'integer', isNullable: false },
          { name: 'date', type: 'date', isNullable: false },
          { name: 'post_count', type: 'integer', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_model_platform_id_date',
            columnNames: ['model_platform_id', 'date'],
          }),
        ],
      }),
      true,
    );

    // ========= SCHEDULER =========

    await queryRunner.createTable(
      new Table({
        name: 'scheduler',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'model_id', type: 'integer', isNullable: false },
          { name: 'platform_id', type: 'integer', isNullable: false },
          { name: 'scheduled_date', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // ========= POST_QUEUE_ENTITY =========

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_queue_entity" (
        "id" SERIAL NOT NULL,
        "model_platform_id" integer NOT NULL,
        "post_id" integer NOT NULL,
        "caption_index" integer NOT NULL DEFAULT 0,
        "file_index" integer NOT NULL DEFAULT 0,
        "used_count" integer NOT NULL DEFAULT 0,
        "total_captions" integer NOT NULL DEFAULT 0,
        "total_files" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_b8f5bc4f96e4a87b28fad7b7130" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_47951a12845e60439d38f350f51" UNIQUE ("model_platform_id", "post_id")
      );
    `);

    // ========= SEED PLATFORM onlyfans =========

    await queryRunner.query(`
      INSERT INTO platform (name, created_at, updated_at)
      SELECT 'onlyfans', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM platform WHERE name = 'onlyfans');
    `);

    // ========= SEED SUPER ADMIN =========

    const email = 'jcosta@costaindustries.com';
    const existing = await queryRunner.query(
      `SELECT 1 FROM "user" WHERE email = $1`,
      [email],
    );

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash('abcd1234', 10);
      await queryRunner.query(
        `INSERT INTO "user" (email, password, "firstName", "lastName", "prokey")
         VALUES ($1, $2, $3, $4, $5)`,
        [email, passwordHash, 'John', 'Costa', ''],
      );
      console.log('Super admin user created');
    } else {
      console.log('Super admin user already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "post_queue_entity"`);
    await queryRunner.dropTable('scheduler', true);
    await queryRunner.dropTable('model_daily_limit_entity', true);
    await queryRunner.dropTable('model_status_log_entity', true);

    await queryRunner.query(`DROP TABLE IF EXISTS public.post_time CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.post_file CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.post_caption CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.post CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.platform_group CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.group_message CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.message CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public."group" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.model_platform CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.platform CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.model CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS public."user" CASCADE`);
  }
}
