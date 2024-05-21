// src/auth/auth.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';

import { ChangePasswordDto } from 'src/dtos/change-password.dto';
import { LoginDto } from 'src/dtos/login.dto';
import { UserDto } from 'src/dtos/user.dto';
import { UserResponseDto } from 'src/dtos/user-response.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';

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
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Request() req,
  ): Promise<boolean> {
    try {
      const { currentPassword, newPassword } = body;

      // Verify the current password
      const isCurrentPasswordValid =
        await this.authService.verifyCurrentPassword(
          req.user.id,
          currentPassword,
        );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Invalid current password');
      }

      // Update the password
      await this.authService.updatePassword(req.user.id, newPassword);
      return true;
    } catch (error) {
      throw error;
    }
  }
}
