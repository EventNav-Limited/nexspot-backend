import { Module } from '@nestjs/common';
import { UsersHelper } from './users.helper.js';
import { ConfigModule } from '../config/config.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [UsersController],
  providers: [UsersHelper, UsersService],
  exports: [UsersHelper],
})
export class UsersModule {}
