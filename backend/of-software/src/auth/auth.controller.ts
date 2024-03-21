// src/auth/auth.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';

import { ChangePasswordDto } from 'src/dtos/change-password.dto';
import { LoginDto } from 'src/dtos/login.dto';
import { UserDto } from 'src/dtos/user.dto';
import { UserResponseDto } from 'src/dtos/user-response.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body(new ValidationPipe()) user: LoginDto,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    try {
      const result = await this.authService.login(user);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('register')
  async register(
    @Body(new ValidationPipe()) user: UserDto,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    try {
      const result = await this.authService.register(user);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('change-password')
  @UseGuards(AuthGuard('local'))
  async changePassword(
    @Body() body: ChangePasswordDto,
    user: any,
  ): Promise<boolean> {
    try {
      const { currentPassword, newPassword } = body;

      // Verify the current password
      const isCurrentPasswordValid =
        await this.authService.verifyCurrentPassword(user.id, currentPassword);

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Invalid current password');
      }

      // Update the password
      await this.authService.updatePassword(user.id, newPassword);
      return true;
    } catch (error) {
      throw error;
    }
  }
}
