// token.service.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from '../config/env.js';
import { PrismaService } from '../config/prisma.service.js';
import { Prisma } from 'src/generated/prisma/client.js';

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  generateAccessToken(userId: string) {
    return this.jwt.sign(
      { sub: userId },
      {
        secret: env.ACCESS_SECRET,
        expiresIn: env.ACCESS_EXPIRES_IN,
      },
    );
  }

  generateRefreshToken(userId: string, device_id: string) {
    return this.jwt.sign(
      { sub: userId, device_id },
      {
        secret: env.REFRESH_SECRET,
        expiresIn: env.REFRESH_EXPIRES_IN,
      },
    );
  }

  createSession(data: Prisma.SessionCreateInput) {
    return this.prisma.session.create({ data });
  }

  updateSession(data: Prisma.SessionCreateInput) {
    return this.prisma.session.upsert({
      where: {
        deviceId: data.deviceId,
      },
      update: {
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
      create: data,
    });
  }

  findSession(deviceId: string) {
    return this.prisma.session.findUnique({
      where: { deviceId },
    });
  }

  deleteSession(deviceId: string) {
    return this.prisma.session.delete({
      where: {
        deviceId,
      },
    });
  }
}
