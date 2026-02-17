import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { UsersService } from '../users/users.service.js';
import { env } from '../config/env.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}
  async register(dto: RegisterDto) {
    // 1. Check if user already exists
    const userExists = await this.usersService.findByEmail(dto.email);
    if (userExists) throw new BadRequestException('Email already in use');

    // 2. Hash the password (using 10 salt rounds)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`;

    // 3. Create the new user
    const newUser = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      name: fullName,
    });

    // 4. Return JWT (optional: some APIs require manual login after register)
    const payload = { sub: newUser.id, email: newUser.email };
    return {
      user: { id: newUser.id, email: newUser.email },
      token: await this.jwtService.signAsync(payload, {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
      }),
    };
  }

  async login(dto: LoginDto) {
    // 1. Find user by email
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate JWT
    const payload = { sub: user.id, email: user.email };
    return {
      user: { id: user.id, email: user.email, name: user.name },
      token: await this.jwtService.signAsync(payload, {
        secret: env.JWT_SECRET, // Manual pass to avoid your current "undefined" issue
        expiresIn: env.JWT_EXPIRES_IN,
      }),
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        message:
          'If an account exists with this email, you will receive a password reset link.',
      };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + env.PASSWORD_RESET_EXPIRY_MINUTES,
    );

    await this.usersService.update(user.id, {
      password_reset_token: token,
      password_reset_expires_at: expiresAt,
    });

    // TODO: send email with reset link (e.g. https://yourapp.com/reset-password?token=...)
    // For now we return the token in dev only so you can test; remove in production.
    const isDev = env.NODE_ENV === 'development';
    return {
      message:
        'If an account exists with this email, you will receive a password reset link.',
      ...(isDev && { resetToken: token }),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user || !user.password_reset_expires_at) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    if (new Date() > user.password_reset_expires_at) {
      throw new UnauthorizedException('Reset token has expired');
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      password_reset_token: null,
      password_reset_expires_at: null,
    });

    return {
      message: 'Password has been reset. You can now log in with your new password.',
    };
  }
}
