import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { env } from '../config/env.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import type { Response, Request } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';
import { successResponse } from '../lib/response.lib.js';
import { GoogleAuthGuard } from './guard/google-auth.guard.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';

const REFRESH_COOKIE = 'refresh_token';
const DEVICE_COOKIE = 'device_id';

const refreshCookieOptions = {
  httpOnly: false, // JS cannot read it
  secure: false, // HTTPS only
  sameSite: 'lax' as const,
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
    @Body() dto: LoginDto,
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

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google automatically, nothing to do here
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { refresh_token, device_id, ...data } =
      await this.authService.googleLogin(req.user as any);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    // Redirect to frontend with access token in query param
    return res.redirect(
      `${env.FRONTEND_URL}?access_token=${data.payload.access_token}`,
    );
  }

  // ─── forgot-password ──────────────────────────────────────────────────────────────

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email!);
    return successResponse(null);
  }

  // ─── reset-password ──────────────────────────────────────────────────────────────

  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ForgotPasswordDto,
  ) {
    await this.authService.resetPassword(token, dto.password!);
    return successResponse(null);
  }

  // ─── refresh ──────────────────────────────────────────────────────────────

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refresh_token = req.cookies?.refresh_token; // ← was 'refreshToken', cookie is set as 'refresh_token'

    if (!refresh_token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { access_token } = await this.authService.refresh(refresh_token);

    return successResponse(access_token);
  }

  // ─── logout ──────────────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      console.log('no token');
    }
    await this.authService.logout(refresh_token);

    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.clearCookie(DEVICE_COOKIE, deviceCookieOptions);

    return successResponse(null);
  }
}
