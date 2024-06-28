// auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserService } from '../user/user.service'; // Adjust the path based on your project structure
import { User } from '../user/user.entity'; // Adjust the path based on your project structure
import { JwtService } from '@nestjs/jwt';
import { instanceToPlain } from 'class-transformer';
import { UserResponseDto } from 'src/dtos/user-response.dto';
import { UserDto } from 'src/dtos/user.dto';
import { LoginDto } from 'src/dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findByEmail(payload.email);

    return user || null;
  }

  async login(
    login: LoginDto,
  ): Promise<{ access_token: string; user: UserResponseDto }> {
    // try {
    // Validate the user's credentials
    const { email, password } = login;

    const user = await this.userService.findByEmail(email, true);

    if (!user) {
      // Credentials are not valid
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await this.comparePasswords(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
    };
    const access_token = this.jwtService.sign(payload, { expiresIn: '100y' });
    delete user['password'];
    return { access_token, user };
    // } catch (err) {
    //   console.error('Auth login error', err);
    // }
  }

  async register({
    firstName,
    lastName,
    photo,
    email,
    password,
  }: UserDto): Promise<{ access_token: string; user: UserResponseDto }> {
    // try {
    // Check if the email is already taken
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      throw new UnauthorizedException('Email is already taken');
    }

    // Hash the password before saving it
    // const hashedPassword = await this.hashPassword(password);

    // Create a new user
    const newUser = await this.userService.create({
      firstName,
      lastName,
      photo,
      email,
      password,
    });
    const result = instanceToPlain(newUser) as UserResponseDto;
    const payload: JwtPayload = {
      sub: result.id.toString(),
      email: result.email,
    };
    const access_token = this.jwtService.sign(payload);
    delete newUser['password'];
    return { access_token, user: newUser };
    // } catch (err) {
    //   console.error('Auth register error', err);
    // }
  }

  private async comparePasswords(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
    return isMatch;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds: number = 10;
    const result = await bcrypt.hash(password, saltRounds);

    return result;
  }

  async updatePassword(
    userId: number,
    newPassword: string,
  ): Promise<{ access_token: string }> {
    // try {
    // Retrieve user from the database
    const user = await this.userService.findById(userId);

    if (!user) {
      return { access_token: null };
    }

    user.password = newPassword;

    await this.userService.update(user.id, user);
    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
    };
    const access_token = this.jwtService.sign(payload);
    return { access_token };
    // } catch (err) {
    //   console.error('Auth updatePassword error', err);
    // }
  }

  async verifyCurrentPassword(
    userId: number,
    currentPassword: string,
  ): Promise<boolean> {
    try {
      const user = await this.userService.findById(userId, true);
      if (user) {
        // Example: Compare the stored password hash with the currentPassword
        const isPasswordMatch = await bcrypt.compare(
          currentPassword,
          user.password,
        );

        if (isPasswordMatch) {
          // Passwords match, proceed with the logic
          // You might want to return a success message or perform additional actions
          console.log('Password is correct!');
          return true;
        } else {
          // Passwords do not match
          // You might want to return an error message or handle it accordingly
          console.log('Incorrect password!');
          return false;
        }
      } else {
        // User not found
        // You might want to return an error message or handle it accordingly
        console.log('User not found!');
        return false;
      }
    } catch (err) {
      console.error('Auth verifyCurrentPassword error', err);
    }
  }
}
