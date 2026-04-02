import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { successResponse } from '../lib/response.lib.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async userPeofile(@Req() req) {
    const data = await this.usersService.userProfile(req.user.email);
    return successResponse(data);
  }

  // ─── change-password ──────────────────────────────────────────────────────────────

  @Put('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const data = await this.usersService.changePassword(dto, req.user.email);
    return successResponse(data);
  }
}
