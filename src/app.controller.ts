import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service.js';
import { successResponse } from './lib/response.lib.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('root')
  @HttpCode(HttpStatus.OK)
  get_hello() {
    return successResponse(this.appService.get_hello());
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return successResponse(this.appService.health());
  }
}
