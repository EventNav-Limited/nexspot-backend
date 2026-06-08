import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthLoginService } from '../services/auth-login.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { successResponse } from '../../lib/response.lib.js';
import { GoogleAuthGuard } from '../guard/google-auth.guard.js';
import { JwtAuthGuard } from '../guard/jwt-auth.guard.js';
import { env } from '../../config/env.js';
import type { Response, Request } from 'express';

const REFRESH_COOKIE = 'refresh_token';
const DEVICE_COOKIE = 'device_id';

const refreshCookieOptions = {
  httpOnly: false,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/auth',
};

const deviceCookieOptions = {
  httpOnly: false,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 365 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthLoginController {
  constructor(private authLoginService: AuthLoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let device_id = req.cookies?.device_id;

    if (!device_id) {
      device_id = crypto.randomUUID();
    }

    const { refresh_token, ...data } = await this.authLoginService.login(
      dto,
      device_id,
    );

    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);
    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);

    return successResponse(data);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { refresh_token, device_id, ...data } =
      await this.authLoginService.googleLogin(req.user as any);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    return res.redirect(
      `${env.FRONTEND_URL}?access_token=${data.payload.access_token}`,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { access_token } = await this.authLoginService.refresh(refresh_token);

    return successResponse(access_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      console.log('no token');
    }
    await this.authLoginService.logout(refresh_token);

    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.clearCookie(DEVICE_COOKIE, deviceCookieOptions);

    return successResponse(null);
  }
}
