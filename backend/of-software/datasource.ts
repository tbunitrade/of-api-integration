import { DataSource } from 'typeorm';

const isDocker = process.env.DB_HOST === 'local_pgdb';
const dbName = process.env.DB_NAME || 'of_software';

console.log('📦 Подключение к базе:', dbName);

export const config = new DataSource({
  type: 'postgres',
  host: isDocker ? 'local_pgdb' : 'localhost',
  port: 5432,
  username: 'postgres',
  password: isDocker ? 'supersecretpassword' : 'postgres',
  database: dbName,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'migrations_TypeORM',
  synchronize: false,
  logging: true,
});
