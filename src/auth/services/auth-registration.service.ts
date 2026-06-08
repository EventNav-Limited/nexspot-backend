import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { RegisterDto } from '../dto/register.dto.js';
import { UsersHelper } from '../../users/users.helper.js';
import { TokenService } from './token.service.js';
import { EmailVerificationLib } from '../../lib/email-verification.lib.js';
import { mapUser } from '../../users/users.mapper.js';
import {
  ConflictException,
  InternalException,
  BadRequestException,
} from '../../lib/error.lib.js';

@Injectable()
export class AuthRegistrationService {
  constructor(
    private usersHelper: UsersHelper,
    private tokenService: TokenService,
    private emailVerificationLib: EmailVerificationLib,
  ) {}

  async register(dto: RegisterDto) {
    const userExists = await this.usersHelper.findByEmail(dto.email);
    if (userExists)
      throw new ConflictException('An account with this email already exists');

    const hashedPassword = await argon2.hash(dto.password);

    const newUser = await this.usersHelper.create({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      profilePhotoURL:
        dto.profilePhotoURL ||
        `https://ui-avatars.com/api/?name=${dto.firstName}+${dto.lastName}`,
    });

    const access_token = this.tokenService.generateAccessToken(newUser.id);
    const deviceId = crypto.randomUUID();
    const refresh_token = this.tokenService.generateRefreshToken(
      newUser.id,
      deviceId,
    );
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tokenHash = await argon2.hash(refresh_token);

    const newSession = await this.tokenService.createSession({
      deviceId,
      tokenHash,
      user: {
        connect: { id: newUser.id },
      },
      expiresAt: expiry,
    });

    try {
      await this.emailVerificationLib.sendRegistrationVerification(
        newUser.id,
        newUser.email,
        newUser.firstName,
      );
    } catch (error) {
      console.log(error);
      await this.usersHelper.delete(newUser.id);
      throw new InternalException(
        'Failed to send verification email. Please try again.',
      );
    }

    return {
      refresh_token,
      device_id: newSession.deviceId,
      payload: {
        user: mapUser(newUser),
        access_token,
      },
    };
  }

  async verify(token: string) {
    const { userId, purpose } = this.emailVerificationLib.verifyToken(token);

    if (purpose !== 'registration') {
      throw new BadRequestException('Invalid verification token');
    }

    await this.usersHelper.update(userId, { isActive: true });
  }
}
