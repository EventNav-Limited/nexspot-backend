import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter, ValidationException } from './lib/error.lib.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow port reuse — prevents EADDRINUSE during hot reload
  app.getHttpServer().on('listening', () => {
    app.getHttpServer().keepAliveTimeout = 0;
  });

  const httpServer = app.getHttpServer();
  httpServer.on('close', () => {});

  app.use(cookieParser());

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // ← add this
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          field: e.property,
          message: Object.values(e.constraints ?? {}).join(', '),
        }));
        return new ValidationException(details);
      },
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://nexspot.vercel.app',
      'https://api.nexspot.com.ng',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);

  // Ensure the port is released cleanly
  // when the watcher kills this process
  process.on('SIGTERM', () => {
    void app.close().then(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    void app.close().then(() => process.exit(0));
  });
  // this is the endddd
}
bootstrap();
