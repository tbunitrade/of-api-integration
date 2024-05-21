// src/user/user.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { UserDto } from '../dtos/user.dto';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(user: UserDto): Promise<User> {
    try {
      const { email } = user;
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
      const hashedPassword = await this.hashPassword(user.password);
      user.password = hashedPassword;
      const newUser = this.userRepository.create(user);
      return await this.userRepository.save(newUser);
    } catch (err) {
      console.error('User create error', err);
    }
  }

  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<User | undefined> {
    try {
      const queryBuilder = this.userRepository.createQueryBuilder('user');

      // Optionally include the password based on the parameter
      if (includePassword) {
        queryBuilder.addSelect('user.password');
      }

      return queryBuilder.where('user.email = :email', { email }).getOne();
    } catch (err) {
      console.error('User findByEmail error', err);
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.userRepository.find();
    } catch (err) {
      console.error('User findAll error', err);
    }
  }

  async findById(id: number): Promise<User> {
    try {
      const options: FindOneOptions<User> = {
        where: { id },
      };
      return await this.userRepository.findOne(options);
    } catch (err) {
      console.error('User findById error', err);
    }
  }

  async update(id: number, updateUserDto: Partial<User>): Promise<User> {
    try {
      const options: FindOneOptions<User> = {
        where: { id },
      };
      const user = await this.userRepository.findOne(options);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Exclude sensitive information like password from being updated

      if (updateUserDto.password) {
        const hashedPassword = await this.hashPassword(updateUserDto.password);
        delete updateUserDto.password;
        updateUserDto.password = hashedPassword;
      }

      const updatedUser = await this.userRepository.save({
        ...user,
        ...updateUserDto,
      });

      return updatedUser;
    } catch (err) {
      console.error('User update error', err);
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    // Implement your search logic based on the query
    // This can involve querying the database using the TypeORM repository
    try {
      const searchResults = await this.userRepository
        .createQueryBuilder('user')
        .where('user.firstName LIKE :query', { query: `%${query}%` })
        .orWhere('user.lastName LIKE :query', { query: `%${query}%` })
        .orWhere('user.email LIKE :query', { query: `%${query}%` })
        .getMany();

      return searchResults;
    } catch (err) {
      console.error('User searchUsers error', err);
    }
  }

  async deleteUser(id: number): Promise<User> {
    try {
      const options: FindOneOptions<User> = {
        where: { id },
      };
      const user = await this.userRepository.findOne(options);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return await this.userRepository.remove(user);
    } catch (err) {
      console.error('User deleteUser error', err);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }
}
