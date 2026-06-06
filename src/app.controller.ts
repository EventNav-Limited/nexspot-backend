import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service.js';
import { successResponse } from './lib/response.lib.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Root endpoint — returns a greeting message.
   *
   * @route GET /root
   *
   * @returns {SuccessResponse<string>}
   */
  @Get('root')
  @HttpCode(HttpStatus.OK)
  get_hello() {
    return successResponse(this.appService.get_hello());
  }

  /**
   * Health check — confirms the server is running and reachable.
   *
   * @route GET /health
   *
   * @returns {SuccessResponse<string>}
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return successResponse(this.appService.health());
  }
}
