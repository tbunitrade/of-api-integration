import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1749140000000 implements MigrationInterface {
  name = 'InitSchema1749140000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      CREATE TABLE public.platform (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

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
        prokey VARCHAR
      );
    `);

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
      CREATE TABLE public.platform_group (
        id SERIAL PRIMARY KEY,
        platform_id INTEGER NOT NULL REFERENCES public.platform(id),
        group_id INTEGER NOT NULL REFERENCES public."group"(id),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE public.post (
        id SERIAL PRIMARY KEY,
        model_platform_id INTEGER NOT NULL REFERENCES public.model_platform(id),
        number_of_days INTEGER DEFAULT 0 NOT NULL,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        scheduled_date VARCHAR,
        user_tags VARCHAR,
        form_tags VARCHAR
      );
    `);

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
