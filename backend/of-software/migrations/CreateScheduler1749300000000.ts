import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateScheduler1749300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'scheduler',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'model_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'platform_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'scheduled_date',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('scheduler');
  }
}
