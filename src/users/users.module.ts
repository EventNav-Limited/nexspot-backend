import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  imports: [ConfigModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
