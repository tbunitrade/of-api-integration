import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    this.logger.log('🔄 Running migrations...');

    try {
      await this.dataSource.runMigrations();
      this.logger.log('✅ Migrations completed!');

      // 🟢 Создаем тестового пользователя, если его нет
      const userRepository = this.dataSource.getRepository(User);
      const existingUser = await userRepository.findOne({
        where: { email: 'test@example.com' },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('testpassword', 10);
        const testUser = userRepository.create({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: hashedPassword,
        });
        await userRepository.save(testUser);
        this.logger.log('👤 Test user created!');
      } else {
        this.logger.log('✅ Test user already exists.');
      }
    } catch (error) {
      this.logger.error('Error during DB migration or user creation:', error);
    }
  }
}
