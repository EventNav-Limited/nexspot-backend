import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { UsersHelper } from '../../users/users.helper.js';
import { EmailVerificationLib } from '../../lib/email-verification.lib.js';
import { BadRequestException } from '../../lib/error.lib.js';

@Injectable()
export class AuthPasswordService {
  constructor(
    private usersHelper: UsersHelper,
    private emailVerificationLib: EmailVerificationLib,
  ) {}

  async forgotPassword(dto: string) {
    if (!dto) throw new BadRequestException('Invalid email');
    const user = await this.usersHelper.findByEmail(dto);
    if (!user) throw new BadRequestException('Invalid email');

    await this.emailVerificationLib.sendForgotPasswordEmail(dto, user.id);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const { userId, purpose } = this.emailVerificationLib.verifyToken(token);

    if (purpose !== 'forgot-password') {
      throw new BadRequestException('Invalid token purpose');
    }

    const hash = await argon2.hash(newPassword);
    await this.usersHelper.update(userId, { password: hash });
  }
}
