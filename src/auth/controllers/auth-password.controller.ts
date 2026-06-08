import { Body, Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthPasswordService } from '../services/auth-password.service.js';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { successResponse } from '../../lib/response.lib.js';

@Controller('auth')
export class AuthPasswordController {
  constructor(private authPasswordService: AuthPasswordService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authPasswordService.forgotPassword(dto.email!);
    return successResponse(null);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ForgotPasswordDto,
  ) {
    await this.authPasswordService.resetPassword(token, dto.password!);
    return successResponse(null);
  }
}
