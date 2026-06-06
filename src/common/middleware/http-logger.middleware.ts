import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly isDev = process.env.NODE_ENV !== 'production';

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const log = {
        timestamp: new Date().toISOString(),
        context: 'HTTP',
        method,
        url: originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startTime,
      };

      const output = this.isDev
        ? JSON.stringify(log, null, 2)
        : JSON.stringify(log);

      if (res.statusCode >= 500) {
        this.logger.error(output);
      } else if (res.statusCode >= 400) {
        this.logger.warn(output);
      } else {
        this.logger.log(output);
      }
    });

    next();
  }
}
