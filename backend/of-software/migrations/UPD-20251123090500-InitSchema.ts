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

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_model_platform_model_platform
      ON public.model_platform(model_id, platform_id);
    `);

    // GROUP
    await queryRunner.query(`
      CREATE TABLE public."group" (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
--         model_id INTEGER NOT NULL,
--         massmsg BOOLEAN NOT NULL DEFAULT false,
        model_id INTEGER NOT NULL REFERENCES public.model(id) ON DELETE CASCADE,
        massmsg BOOLEAN NOT NULL DEFAULT false,
        added_on_platform_at TIMESTAMP DEFAULT now(),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        "order" INTEGER
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_group_model_platform_massmsg
      ON public."group"(model_id, massmsg);
    `);

    // MESSAGE
    await queryRunner.query(`
      CREATE TABLE public.message (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        message_time TIME NULL,
        price DOUBLE PRECISION,
        message_list VARCHAR,
        message VARCHAR,
        message_exclude_list VARCHAR,
        content VARCHAR,
        content_attached BOOLEAN DEFAULT false NOT NULL,
        release_form_tags VARCHAR,
        release_user_tags VARCHAR,
        free_preview INTEGER,
        status INTEGER DEFAULT 1 NOT NULL,
        -- NEW (mass message template fields)
        massmsg BOOLEAN NOT NULL DEFAULT false,
        audience_include_ids JSONB,
        audience_exclude_ids JSONB,
        user_ids_array JSONB,
        vault_media_ids JSONB,
        scheduled_date TIMESTAMPTZ,
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

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_group_message_group_message
      ON public.group_message (group_id, message_id);
    `);

    // PLATFORM_GROUP
    // await queryRunner.query(`
    //   CREATE TABLE public.platform_group (
    //     id SERIAL PRIMARY KEY,
    //     platform_id INTEGER NOT NULL REFERENCES public.platform(id),
    //     group_id INTEGER NOT NULL REFERENCES public."group"(id),
    //     status INTEGER DEFAULT 1 NOT NULL,
    //     created_at TIMESTAMP DEFAULT now() NOT NULL,
    //     updated_at TIMESTAMP DEFAULT now() NOT NULL
    //   );
    // `);

    // PLATFORM_GROUP
    await queryRunner.query(`
      CREATE TABLE public.platform_group (
         id SERIAL PRIMARY KEY,
         platform_id INTEGER NOT NULL REFERENCES public.platform(id),
         group_id INTEGER NOT NULL REFERENCES public."group"(id),

         status INTEGER DEFAULT 1 NOT NULL,

        -- OFAPI state (то что ты хотел ALTER'ом)
         added_on_platform_at TIMESTAMP NULL,
         last_scheduled_at TIMESTAMPTZ NULL,
         last_published_at TIMESTAMPTZ NULL,
         last_external_id BIGINT NULL,

         created_at TIMESTAMP DEFAULT now() NOT NULL,
         updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_group_platform_group
      ON public.platform_group(platform_id, group_id);
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

    // ========= SCHEDULER for Python usage =========

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

// ========= SCHEDULER type OF Api =========
    await queryRunner.query(`
      CREATE TABLE public.schedulerofapi (
                                      id SERIAL PRIMARY KEY,

        -- что мы планируем/выполняем
                                      model_platform_id INTEGER NOT NULL REFERENCES public.model_platform(id) ON DELETE CASCADE,
                                      group_id INTEGER NULL REFERENCES public."group"(id) ON DELETE SET NULL,
                                      message_id INTEGER NULL REFERENCES public.message(id) ON DELETE SET NULL,

                                      job_type VARCHAR NOT NULL DEFAULT 'massmsg',     -- massmsg / post / sync / etc
                                      status VARCHAR NOT NULL DEFAULT 'queued',       -- queued / scheduled / sent / done / failed / canceled
                                      attempt INTEGER NOT NULL DEFAULT 0,
                                      error TEXT NULL,

                                      scheduled_at TIMESTAMPTZ NULL,                  -- когда ДОЛЖНО уйти (UTC)
                                      external_id BIGINT NULL,                        -- provider queue id (data.id)

                                      payload JSONB NULL,                             -- наш payload на отправку
                                      provider_response JSONB NULL,                   -- ответ провайдера (или queue object)

        -- денормализация нужных полей из provider_response (быстро для UI)
                                      provider_date TIMESTAMPTZ NULL,
                                      provider_is_ready BOOLEAN NULL,
                                      provider_is_done BOOLEAN NULL,
                                      provider_has_error BOOLEAN NULL,
                                      provider_is_canceled BOOLEAN NULL,
                                      provider_pending INTEGER NULL,
                                      provider_total INTEGER NULL,
                                      provider_can_unsend BOOLEAN NULL,
                                      provider_unsend_seconds INTEGER NULL,

                                      created_at TIMESTAMP NOT NULL DEFAULT now(),
                                      updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedulerofapi_mp ON public.schedulerofapi(model_platform_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedulerofapi_group ON public.schedulerofapi(group_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedulerofapi_message ON public.schedulerofapi(message_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedulerofapi_external ON public.schedulerofapi(external_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedulerofapi_status ON public.schedulerofapi(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedulerofapi_scheduled_at ON public.schedulerofapi(scheduled_at)`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_schedulerofapi_unique_job
      ON public.schedulerofapi(model_platform_id, message_id, scheduled_at, job_type)
      WHERE message_id IS NOT NULL AND scheduled_at IS NOT NULL;
    `);

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

    const email = 'tbunitrade@gmail.com';
    const existing = await queryRunner.query(
      `SELECT 1 FROM "user" WHERE email = $1`,
      [email],
    );

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash('Dyb3t321', 10);
      await queryRunner.query(
        `INSERT INTO "user" (email, password, "firstName", "lastName", "prokey")
         VALUES ($1, $2, $3, $4, $5)`,
        [email, passwordHash, 'Alex', 'Sonich', ''],
      );
      console.log('Super admin user created');
    } else {
      console.log('Super admin user already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // сначала то, что ссылается на другие таблицы
    await queryRunner.query(`DROP TABLE IF EXISTS public.schedulerofapi CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_queue_entity"`);
    // дальше — сервисные
    await queryRunner.dropTable('scheduler', true);
    await queryRunner.dropTable('model_daily_limit_entity', true);
    await queryRunner.dropTable('model_status_log_entity', true);
    // дальше основная доменная часть
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
    // индекс можно не дропать отдельно (CASCADE и так его убьёт)
    await queryRunner.query(`DROP INDEX IF EXISTS ux_group_message_group_message;`);
  }
}
