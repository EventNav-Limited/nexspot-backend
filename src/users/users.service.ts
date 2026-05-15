import argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '../lib/error.lib.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UsersHelper } from './users.helper.js';
import { mapUser } from './users.mapper.js';

@Injectable()
export class UsersService {
  constructor(private usersHelper: UsersHelper) {}

  // ─── user-details ──────────────────────────────────────────────────────────────

  async userProfile(email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return mapUser(user);
  }

  // ─── change-password ──────────────────────────────────────────────────────────────

  async changePassword(dto: ChangePasswordDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please login with Google.',
      );
    }

    // Compare passwords
    const isMatch = await argon2.verify(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const hashedPassword = await argon2.hash(dto.password);

    await this.usersHelper.update(user.id, {
      password: hashedPassword,
    });

    return {
      message:
        'Password has been reset. You can now log in with your new password.',
    };
  }
}
