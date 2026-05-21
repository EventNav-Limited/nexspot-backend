import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ConfigModule } from './config/config.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { EventsModule } from './events/events.module.js';
import { AdminModule } from './admin/admin.module.js';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware.js';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    CategoriesModule,
    UsersModule,
    OnboardingModule,
    EventsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*'); // or scope to specific routes
  }
}
