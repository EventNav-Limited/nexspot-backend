import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  get_hello(): string {
    return this.appService.get_hello();
  }

  @Get('health')
  health() {
    return this.appService.health();
  }
}
