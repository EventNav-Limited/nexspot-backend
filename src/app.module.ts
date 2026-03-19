import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ConfigModule } from './config/config.module.js';
import { CategoriesModule } from './categories/categories.module.js';

@Module({
  imports: [AuthModule, UsersModule, ConfigModule, CategoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
