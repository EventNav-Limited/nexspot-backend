import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { successResponse } from '../lib/response.lib.js';

const REFRESH_COOKIE = 'refresh_token';
const DEVICE_COOKIE = 'device_id';

const refreshCookieOptions = {
  httpOnly: true, // JS cannot read it
  secure: true, // HTTPS only
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/auth', // only sent to /auth/* routes
};

const deviceCookieOptions = {
  httpOnly: false,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 365 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Register ──────────────────────────────────────────────────────────────

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, device_id, ...data } =
      await this.authService.register(dto);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    return successResponse(data);
  }

  // ─── Login ──────────────────────────────────────────────────────────────

  @Post('login')
  async login(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let device_id = req.cookies.device_id;

    if (!device_id) {
      device_id = crypto.randomUUID();
    }

    const { refresh_token, ...data } = await this.authService.login(
      dto,
      device_id,
    );

    // Set refresh_token as HTTP-only, secure cookie
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);

    return successResponse(data);
  }

  // auth.controller.ts
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refresh_token = req.cookies?.refresh_token; // ← was 'refreshToken', cookie is set as 'refresh_token'

    if (!refresh_token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { access_token } = await this.authService.refresh(refresh_token);

    return successResponse(access_token);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const data = await this.authService.changePassword(dto, req.user.email);
    return successResponse(data);
  }

  // auth.controller.ts
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      console.log('no token');
    }
    await this.authService.logout(refresh_token);

    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
    res.clearCookie(DEVICE_COOKIE, { sameSite: 'lax' });

    return successResponse(null);
  }
}
