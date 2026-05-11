import * as bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { TokenService } from './token.service.js';
import { mapUser } from '../users/users.mapper.js';
import { RegisterDto } from './dto/register.dto.js';
import { UsersHelper } from '../users/users.helper.js';
import {
  BadRequestException,
  ConflictException,
  InternalException,
  UnauthorizedException,
} from '../lib/error.lib.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersHelper: UsersHelper,
    private tokenService: TokenService,
    private emailVerificationLib: EmailVerificationLib,
  ) {}

  // ─── register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    // 1. Check if user already exists
    const userExists = await this.usersHelper.findByEmail(dto.email);
    if (userExists)
      throw new ConflictException('An account with this email already exists');

    // 2. Hash the password (using 10 salt rounds)
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 3. Create the new user
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

    const salt = await bcrypt.genSalt(12);
    const tokenHash = await bcrypt.hash(refresh_token, salt);

    const newSession = this.tokenService.createSession({
      deviceId,
      tokenHash,
      user: {
        connect: { id: newUser.id },
      },
      expiresAt: expiry,
    });

    // Send email — rollback user + session if it fails
    try {
      await this.emailVerificationLib.sendRegistrationVerification(
        newUser.email,
        newUser.firstName,
      );
    } catch (error) {
      console.log(error);
      await this.usersHelper.delete(newUser.id); // cascades session if set up
      throw new InternalException(
        'Failed to send verification email. Please try again.',
      );
    }

    // 4. Return JWT (optional: some APIs require manual login after register)
    return {
      refresh_token,
      device_id: (await newSession).deviceId,
      payload: {
        user: mapUser(newUser),
        access_token,
      },
    };
  }

  async verify(userId: string) {
    await this.usersHelper.update(userId, { isActive: true });
  }

  // ─── login ──────────────────────────────────────────────────────────────

  async login(dto: LoginDto, deviceId: string) {
    // 1. Find user by email
    const user = await this.usersHelper.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid Email Or Password');
    }

    // After finding the user
    if (user.authProvider === 'GOOGLE') {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please login with Google.',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please login with Google.',
      );
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid Email Or Password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account not verifies. please verify your account',
      );
    }

    const access_token = this.tokenService.generateAccessToken(user.id);
    const refresh_token = this.tokenService.generateRefreshToken(
      user.id,
      deviceId,
    );

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const salt = await bcrypt.genSalt(12);
    const tokenHash = await bcrypt.hash(refresh_token, salt);

    await this.tokenService.updateSession({
      deviceId,
      tokenHash,
      user: {
        connect: { id: user.id },
      },
      expiresAt: expiry,
    });

    // 3. Generate JWT
    return {
      refresh_token,
      payload: {
        user: mapUser(user),
        access_token,
      },
    };
  }

  // ─── google-login ──────────────────────────────────────────────────────────────
  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
  }) {
    // 1. Check if user exists by googleId
    let user = await this.usersHelper.findByGoogleId(googleUser.googleId);

    // 2. If not, check if email already exists as a LOCAL account
    if (!user) {
      const existingUser = await this.usersHelper.findByEmail(googleUser.email);
      if (existingUser) {
        throw new ConflictException(
          'An account with this email already exists. Please login with your password.',
        );
      }

      // 3. Create new Google user
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

    // 4. Generate tokens
    const deviceId = crypto.randomUUID();
    const access_token = this.tokenService.generateAccessToken(user.id);
    const refresh_token = this.tokenService.generateRefreshToken(
      user.id,
      deviceId,
    );

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const salt = await bcrypt.genSalt(12);
    const tokenHash = await bcrypt.hash(refresh_token, salt);

    await this.tokenService.createSession({
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

  // ─── refresh ──────────────────────────────────────────────────────────────

  async refresh(refresh_token: string) {
    // 1. Verify signature & expiry
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

    // 2. Find session
    const session = await this.tokenService.findSession(payload.device_id);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // 3. Check session expiry in DB (source of truth — don't rely on JWT alone)
    if (session.expiresAt < new Date()) {
      await this.tokenService.deleteSession(payload.device_id);
      throw new UnauthorizedException('Session expired');
    }

    // 4. Validate token hash
    const valid = await bcrypt.compare(refresh_token, session.tokenHash);
    if (!valid) {
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // 5. Issue new access token
    const access_token = this.tokenService.generateAccessToken(session.userId);

    return { access_token };
  }

  // ─── forgot-password ──────────────────────────────────────────────────────────────

  // To be implementes when mail service is decided
  async forgotPassword(dto: string) {
    if (!dto) throw new BadRequestException('Invalid email');
    const user = await this.usersHelper.findByEmail(dto);
    if (!user) throw new BadRequestException('Invalid email');

    await this.emailVerificationLib.sendForgotPasswordEmail(dto, user.id);
  }

  // ─── reset-password ──────────────────────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const { userId, purpose } = this.emailVerificationLib.verifyToken(token);

    if (purpose !== 'forgot-password') {
      throw new BadRequestException('Invalid token purpose');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await this.usersHelper.update(userId, { password: hash });

    // TODO: Send confirmation email.
    // content: password has been reset. you can now login with new password
  }

  // ─── logout ──────────────────────────────────────────────────────────────

  async logout(refresh_token: string) {
    // Verify just to extract deviceId — ignore expiry,
    // an expired token should still be able to log out
    let payload: { sub: string; device_id: string };
    try {
      payload = await this.jwtService.verify(refresh_token, {
        secret: env.REFRESH_SECRET,
        ignoreExpiration: true, // ← key difference from refresh
      });
      console.log(payload);
    } catch {
      // Malformed token — nothing to delete, just return
      return;
    }
    return this.tokenService.deleteSession(payload.device_id);
  }
}
