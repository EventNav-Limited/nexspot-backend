import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
// import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { TokenService } from './token.service.js';
import { env } from '../config/env.js';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private tokenService: TokenService,
  ) {}
  async register(dto: RegisterDto) {
    // 1. Check if user already exists
    const userExists = await this.usersService.findByEmail(dto.email);
    if (userExists) throw new BadRequestException('Email already in use');

    // 2. Hash the password (using 10 salt rounds)
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`;

    // 3. Create the new user
    const newUser = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      name: fullName,
    });

    const access_token = this.tokenService.generateAccessToken(newUser.id);

    const device_id = crypto.randomUUID();

    const refresh_token = this.tokenService.generateRefreshToken(
      newUser.id,
      device_id,
    );

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const salt = await bcrypt.genSalt(12);
    const token_hash = await bcrypt.hash(refresh_token, salt);

    const newSession = this.tokenService.createSession({
      device_id,
      token_hash,
      user: {
        connect: { id: newUser.id },
      },
      expiresAt: expiry,
    });

    // 4. Return JWT (optional: some APIs require manual login after register)
    return [
      refresh_token,
      (await newSession).device_id,
      {
        user: {
          id: newUser.id,
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: newUser.email,
          role: newUser.role,
          profile_photo_url: `https://ui-avatars.com/api/?name=${dto.firstName}+${dto.lastName}`,
          created_at: newUser.created_at,
        },
        access_token: access_token,
      },
    ];
  }

  async login(dto: LoginDto, device_id: string) {
    // 1. Find user by email
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const name = user.name.split(/\s+/);

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = this.tokenService.generateAccessToken(user.id);
    const refresh_token = this.tokenService.generateRefreshToken(
      user.id,
      device_id,
    );

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const salt = await bcrypt.genSalt(12);
    const token_hash = await bcrypt.hash(refresh_token, salt);

    await this.tokenService.updateSession({
      device_id,
      token_hash,
      user: {
        connect: { id: user.id },
      },
      expiresAt: expiry,
    });

    // 3. Generate JWT
    return [
      refresh_token,
      {
        user: {
          id: user.id,
          first_name: name[0],
          last_name: name[1],
          email: user.email,
          role: user.role,
          profile_photo_url: `https://ui-avatars.com/api/?name=${name[0]}+${name[1]}`,
          created_at: user.created_at,
        },
        access_token: access_token,
      },
    ];
  }

  // auth.service.ts
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
    const valid = await bcrypt.compare(refresh_token, session.token_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 5. Issue new access token
    const access_token = this.tokenService.generateAccessToken(session.user_id);

    return { access_token };
  }

  // // // To be implementes when mail service is decided
  // // async forgotPassword(dto: ForgotPasswordDto) {
  // //   const user = await this.usersService.findByEmail(dto.email);
  // //   if (!user) {
  // //     throw new NotFoundException('Email not found');
  // //   }

  // //   // TODO: send email with reset link (e.g. https://yourapp.com/reset-password?token=...)
  // //   // For now we return the token in dev only so you can test; remove in production.

  // //   const salt = await bcrypt.genSalt(12);
  // //   const hashedPassword = await bcrypt.hash(dto.password, salt);

  // //   await this.usersService.update(user.id, {
  // //     password: hashedPassword,
  // //   });

  // //   return {
  // //     message:
  // //       'Password has been reset. You can now log in with your new password.',
  // //   };
  // // }

  async changePassword(dto: ChangePasswordDto, email: string) {
    const user = await this.usersService.findByEmail(email);
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

    await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    return {
      message:
        'Password has been reset. You can now log in with your new password.',
    };
  }

  // auth.service.ts
  async logout(refresh_token: string) {
    // Verify just to extract device_id — ignore expiry,
    // an expired token should still be able to log out
    let payload: { user_id: string; device_id: string };
    try {
      payload = await this.jwtService.verify(refresh_token, {
        secret: env.REFRESH_SECRET,
        ignoreExpiration: true, // ← key difference from refresh
      });
    } catch {
      // Malformed token — nothing to delete, just return
      return;
    }

    console.log('logout payload:', payload);

    return this.tokenService.deleteSession(payload.device_id);
  }
}
