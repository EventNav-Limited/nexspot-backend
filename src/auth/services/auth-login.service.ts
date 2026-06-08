import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/login.dto.js';
import { UsersHelper } from '../../users/users.helper.js';
import { TokenService } from './token.service.js';
import { EmailVerificationLib } from '../../lib/email-verification.lib.js';
import { mapUser } from '../../users/users.mapper.js';
import { env } from '../../config/env.js';
import {
  UnauthorizedException,
  ConflictException,
} from '../../lib/error.lib.js';

@Injectable()
export class AuthLoginService {
  constructor(
    private usersHelper: UsersHelper,
    private tokenService: TokenService,
    private emailVerificationLib: EmailVerificationLib,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, deviceId: string) {
    const user = await this.usersHelper.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid Email Or Password');
    }

    if (user.authProvider === 'GOOGLE' || !user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please login with Google.',
      );
    }

    const isMatch = await argon2.verify(user.password, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid Email Or Password');
    }

    if (!user.isActive) {
      try {
        await this.emailVerificationLib.sendRegistrationVerification(
          user.id,
          user.email,
          user.firstName,
        );
      } catch (error) {
        console.log(error);
      }
      throw new UnauthorizedException(
        'Account not verified. Please verify your account.',
      );
    }

    const access_token = this.tokenService.generateAccessToken(user.id);
    const refresh_token = this.tokenService.generateRefreshToken(
      user.id,
      deviceId,
    );
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tokenHash = await argon2.hash(refresh_token);

    await this.tokenService.updateSession({
      deviceId,
      tokenHash,
      user: { connect: { id: user.id } },
      expiresAt: expiry,
    });

    return {
      refresh_token,
      payload: {
        user: mapUser(user),
        access_token,
      },
    };
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
  }) {
    let user = await this.usersHelper.findByGoogleId(googleUser.googleId);

    if (!user) {
      const existingUser = await this.usersHelper.findByEmail(googleUser.email);
      if (existingUser) {
        throw new ConflictException(
          'An account with this email already exists. Please login with your password.',
        );
      }

      user = await this.usersHelper.create({
        email: googleUser.email.toLowerCase(),
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        profilePhotoURL: googleUser.picture,
        googleId: googleUser.googleId,
        authProvider: 'GOOGLE',
        isActive: true,
      });
    }

    const deviceId = `google:${user.googleId}`;
    const access_token = this.tokenService.generateAccessToken(user.id);
    const refresh_token = this.tokenService.generateRefreshToken(
      user.id,
      deviceId,
    );
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tokenHash = await argon2.hash(refresh_token);

    await this.tokenService.updateSession({
      deviceId,
      tokenHash,
      user: { connect: { id: user.id } },
      expiresAt: expiry,
    });

    return {
      refresh_token,
      device_id: deviceId,
      payload: {
        user: mapUser(user),
        access_token,
      },
    };
  }

  async refresh(refresh_token: string) {
    let payload: { sub: string; device_id: string };
    try {
      payload = this.jwtService.verify(refresh_token, {
        secret: env.REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersHelper.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');

    const session = await this.tokenService.findSession(payload.device_id);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.expiresAt < new Date()) {
      await this.tokenService.deleteSession(payload.device_id);
      throw new UnauthorizedException('Session expired');
    }

    const valid = await argon2.verify(session.tokenHash, refresh_token);
    if (!valid) {
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const access_token = this.tokenService.generateAccessToken(session.userId);

    return { access_token };
  }

  async logout(refresh_token: string) {
    let payload: { sub: string; device_id: string };
    try {
      payload = await this.jwtService.verify(refresh_token, {
        secret: env.REFRESH_SECRET,
        ignoreExpiration: true,
      });
    } catch {
      return;
    }
    return this.tokenService.deleteSession(payload.device_id);
  }
}
