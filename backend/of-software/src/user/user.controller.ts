// src/user/user.controller.ts

import {
  Body,
  Controller,
  Post,
  ValidationPipe,
  UseGuards,
  Get,
  Param,
  Patch,
  Query,
  Delete,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserDto } from '../dtos/user.dto';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UpdateUserDto } from 'src/dtos/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from 'src/dtos/user-response.dto';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.userService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }
  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addUser(@Body(new ValidationPipe()) user: UserDto): Promise<User> {
    try {
      return await this.userService.create(user);
    } catch (error) {
      throw error;
    }
  }
  @Get('search')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Query('query') query: string): Promise<User[]> {
    try {
      const searchResults = await this.userService.searchUsers(query);

      return searchResults;
    } catch (error) {
      throw error;
    }
  }

  @Get('me')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req): Promise<User> {
    try {
      const id = req.user.id;
      const result = this.userService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch('me')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      const id = req.user.id;
      const result = await this.userService.update(id, updateUserDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: number): Promise<User> {
    try {
      const result = await this.userService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    try {
      const result = await this.userService.update(id, updateUserDto);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: number): Promise<User> {
    try {
      const result = await this.userService.deleteUser(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
