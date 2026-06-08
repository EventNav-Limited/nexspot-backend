import { Module } from '@nestjs/common';
import { EventsManagementService } from './services/events-management.service.js';
import { EventsDiscoveryService } from './services/events-discovery.service.js';
import { EventsTicketingService } from './services/events-ticketing.service.js';
import { EventsManagementController } from './controllers/events-management.controller.js';
import { EventsDiscoveryController } from './controllers/events-discovery.controller.js';
import { EventsTicketingController } from './controllers/events-ticketing.controller.js';
import { PrismaService } from '../config/prisma.service.js';
import { TimezoneHelper } from '../lib/timezone.helper.js';

@Module({
  controllers: [
    EventsManagementController,
    EventsDiscoveryController,
    EventsTicketingController,
  ],
  providers: [
    EventsManagementService,
    EventsDiscoveryService,
    EventsTicketingService,
    PrismaService,
    TimezoneHelper,
  ],
})
export class EventsModule {}
