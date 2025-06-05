import { DataSource } from 'typeorm';

const isDocker = process.env.DB_HOST === 'local_pgdb';

export const config = new DataSource({
  type: 'postgres',
  host: isDocker ? 'local_pgdb' : 'localhost',
  port: 5432,
  username: 'postgres',
  password: isDocker ? 'supersecretpassword' : 'postgres',
  database: 'of_software',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'migrations_TypeORM',
  synchronize: false,
  logging: true,
});

// export const config = new DataSource({
//   type: 'postgres',
//   host: 'localhost',
//   port: 5432,
//   username: 'postgres',
//   password: 'postgres',
//   database: 'of_software',
//   entities: ['dist/**/*.entity{.ts,.js}'],
//   migrations: ['migrations/*.ts'],
//   migrationsTableName: 'migrations_TypeORM',
//   synchronize: false,
//   logging: true,
// });
