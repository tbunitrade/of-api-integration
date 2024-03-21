import { DataSource } from 'typeorm';

export const config = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'of_software',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'migrations_TypeORM',
  synchronize: false,
  logging: true,
});
