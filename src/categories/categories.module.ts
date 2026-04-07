import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesHelper } from './categories.helper.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  imports: [ConfigModule],
  controllers: [CategoriesController],
  providers: [CategoriesHelper, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
