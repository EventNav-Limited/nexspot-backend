import { Module } from '@nestjs/common';
import { CategoriesService } from './services/categories.service.js';
import {
  CategoriesController,
  FormatCntroller,
} from './controllers/categories.controller.js';
import { CategoriesHelper } from './categories.helper.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  imports: [ConfigModule],
  controllers: [CategoriesController, FormatCntroller],
  providers: [CategoriesHelper, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
