import { Module } from '@nestjs/common';
import { AdminService } from './services/admin.service.js';
import { AdminController } from './controllers/admin.controller.js';
import { PrismaService } from '../config/prisma.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
