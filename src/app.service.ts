import { Injectable } from '@nestjs/common';
import { env } from './config/env.js';

@Injectable()
export class AppService {
  get_hello(): string {
    return 'Hello World!';
  }

  health() {
    return {
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }
}
