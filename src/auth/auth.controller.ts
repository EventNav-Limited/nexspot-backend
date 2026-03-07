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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const [refresh_token, device_id, data] =
      await this.authService.register(dto);
    // Set refresh_token as HTTP-only, secure cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true, // Prevents JavaScript access
      secure: false, // Only sent over HTTPS (use false in dev if not using HTTPS)
      sameSite: 'strict', // Prevents CSRF (use 'lax' if needed for cross-site requests)
    });

    res.cookie('device_id', device_id, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      data,
    };
  }

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

    const [refresh_token, data] = await this.authService.login(dto, device_id);

    // Set refresh_token as HTTP-only, secure cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true, // Prevents JavaScript access
      secure: false, // Only sent over HTTPS (use false in dev if not using HTTPS)
      sameSite: 'strict', // Prevents CSRF (use 'lax' if needed for cross-site requests)
      path: '/',
    });

    res.cookie('device_id', device_id, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      data,
    };
  }

  // auth.controller.ts
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refresh_token = req.cookies?.refresh_token; // ← was 'refreshToken', cookie is set as 'refresh_token'

    if (!refresh_token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { access_token } = await this.authService.refresh(refresh_token);

    return { success: true, data: { access_token } };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto, req.user.email);
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

    res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
    res.clearCookie('device_id', { sameSite: 'lax' });

    return { success: true, message: null };
  }
}
