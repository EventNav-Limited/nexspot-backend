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
        device_id: data.device_id,
      },
      update: {
        token_hash: data.token_hash,
        expiresAt: data.expiresAt,
      },
      create: data,
    });
  }

  findSession(device_id: string) {
    return this.prisma.session.findUnique({
      where: { device_id },
    });
  }

  deleteSession(device_id: string) {
    return this.prisma.session.delete({
      where: {
        device_id,
      },
    });
  }
}
