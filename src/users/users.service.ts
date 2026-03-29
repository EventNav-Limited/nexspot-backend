import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '../lib/error.lib.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UsersHelper } from './users.helper.js';

@Injectable()
export class UsersService {
  constructor(private usersHelper: UsersHelper) {}

  // ─── user-details ──────────────────────────────────────────────────────────────

  async userProfile(email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  // ─── change-password ──────────────────────────────────────────────────────────────

  async changePassword(dto: ChangePasswordDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    await this.usersHelper.update(user.id, {
      password: hashedPassword,
    });

    return {
      message:
        'Password has been reset. You can now log in with your new password.',
    };
  }
}
