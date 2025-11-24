import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';

export const config = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'of_software',

  // РАЗРАБОТКА И МИГРАЦИИ → ТОЛЬКО TS
  entities: ['src/**/*.entity.ts'],
  migrations: ['migrations/*.ts'],

  migrationsTableName: 'migrations_TypeORM',
  synchronize: false,
  logging: true,
});
