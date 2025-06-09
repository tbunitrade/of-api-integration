import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1749140000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        id SERIAL PRIMARY KEY,
        "firstName" VARCHAR,
        "lastName" VARCHAR,
        photo VARCHAR,
        email VARCHAR NOT NULL UNIQUE,
        password VARCHAR NOT NULL,
        prokey VARCHAR
      );
      CREATE TABLE model (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        photo VARCHAR,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      CREATE TABLE platform (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      CREATE TABLE model_platform (
        id SERIAL PRIMARY KEY,
        model_id INTEGER NOT NULL REFERENCES model(id),
        platform_id INTEGER NOT NULL REFERENCES platform(id),
        post_id INTEGER,
        username VARCHAR,
        password VARCHAR,
        site_url VARCHAR,
        number_of_days INTEGER DEFAULT 0 NOT NULL,
        scheduled_date VARCHAR,
        latest_group_id INTEGER,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        prokey VARCHAR,
        UNIQUE (post_id)
      );
      CREATE TABLE "group" (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        model_id INTEGER NOT NULL,
        added_on_platform_at TIMESTAMP DEFAULT now(),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        "order" INTEGER
      );
      CREATE TABLE message (
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
      CREATE TABLE group_message (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES "group"(id),
        message_id INTEGER NOT NULL REFERENCES message(id),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      CREATE TABLE platform_group (
        id SERIAL PRIMARY KEY,
        platform_id INTEGER NOT NULL REFERENCES platform(id),
        group_id INTEGER NOT NULL REFERENCES "group"(id),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      CREATE TABLE post (
        id SERIAL PRIMARY KEY,
        model_platform_id INTEGER NOT NULL REFERENCES model_platform(id),
        number_of_days INTEGER DEFAULT 0 NOT NULL,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        scheduled_date VARCHAR,
        user_tags VARCHAR,
        form_tags VARCHAR
      );
      CREATE TABLE post_caption (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES post(id),
        caption VARCHAR NOT NULL,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      CREATE TABLE post_file (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES post(id),
        url VARCHAR,
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
      CREATE TABLE post_time (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES post(id),
        "time" TIME DEFAULT now(),
        status INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS post_time, post_file, post_caption, post, platform_group,
      group_message, message, "group", model_platform, platform, model, "user" CASCADE;
    `);
  }
}
