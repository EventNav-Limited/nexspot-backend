import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter, ValidationException } from './lib/error.lib.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Optional: pair with ValidationPipe so class-validator errors flow through the filter
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          field: e.property,
          message: Object.values(e.constraints ?? {}).join(', '),
        }));
        // throws your ValidationException so the filter handles it uniformly
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
}
bootstrap();
