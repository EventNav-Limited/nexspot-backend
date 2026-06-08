import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { AuthRegistrationService } from '../services/auth-registration.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { successResponse } from '../../lib/response.lib.js';
import type { Response } from 'express';

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
export class AuthRegistrationController {
  constructor(private authRegistrationService: AuthRegistrationService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, device_id, ...data } =
      await this.authRegistrationService.register(dto);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    return successResponse(data);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verify(@Query('token') token: string) {
    await this.authRegistrationService.verify(token);
    return successResponse(null);
  }
}
