import { Events, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../config/prisma.service.js';

export class Event {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.EventsCreateInput): Promise<Events> {
    return this.prisma.events.create({ data });
  }

  findAll() {
    return `This action returns all events`;
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  // update(id: number, updateEventDto: UpdateEventDto) {
  //   return `This action updates a #${id} event`;
  // }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }

  /**
   * Generates a URL-safe slug from a title.
   * Appends a short timestamp suffix to avoid collisions.
   */
  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return `${base}-${Date.now().toString(36)}`;
  }

  /**
   * Formats a date range into a human-readable display string.
   * e.g. "Dec 16 | 10:30 AM – 1:30 PM"
   */
  private formatDateDisplay(start: Date, end: Date): string {
    const dateStr = start.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
    });
    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${dateStr} | ${startTime} – ${endTime}`;
  }

  /**
   * Maps a raw event from DB into the API response shape.
   */
  private mapEvent(event: any) {
    const tickets = event.tickets ?? [];

    // determine if the event is free or paid and the price range
    const prices = tickets.map((t: any) => Number(t.price));
    const isFree = prices.every((p: number) => p === 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      banner_url: event.bannerURL,
      category_id: event.categoryId,
      format_id: event.formatId,
      format: event.format,
      status: event.status.toLowerCase(),
      date: {
        start: event.startDate,
        end: event.endDate,
        display: this.formatDateDisplay(event.startDate, event.endDate),
      },
      location: event.location ? { display: event.location } : null,
      online_link: event.onlineLink ?? null,
      ticket: {
        type: isFree ? 'free' : 'paid',
        min_price: minPrice,
        max_price: maxPrice,
        display_price: isFree ? 'Free' : `₦${minPrice.toLocaleString()}`,
      },
      organizer: event.organizer
        ? {
            id: event.organizer.id,
            name: `${event.organizer.firstName} ${event.organizer.lastName}`,
            photo: event.organizer.profilePhotoURL,
          }
        : null,
    };
  }

  /**
   * Resolves a preset date filter (today, tomorrow, etc.)
   * into a { from, to } range for DB queries.
   */
  private resolveDateRange(
    preset?: string,
    date_from?: string,
    date_to?: string,
  ): { gte?: Date; lte?: Date } {
    if (date_from || date_to) {
      return {
        gte: date_from ? new Date(date_from) : undefined,
        lte: date_to ? new Date(date_to) : undefined,
      };
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    switch (preset) {
      case 'today':
        return { gte: startOfDay, lte: endOfDay };

      case 'tomorrow': {
        const start = new Date(startOfDay);
        start.setDate(start.getDate() + 1);
        const end = new Date(endOfDay);
        end.setDate(end.getDate() + 1);
        return { gte: start, lte: end };
      }

      case 'this_week': {
        const end = new Date(startOfDay);
        end.setDate(end.getDate() + 7);
        return { gte: startOfDay, lte: end };
      }

      case 'this_weekend': {
        const day = now.getDay(); // 0 = Sun, 6 = Sat
        const daysUntilSat = (6 - day + 7) % 7 || 7;
        const sat = new Date(startOfDay);
        sat.setDate(sat.getDate() + daysUntilSat);
        const sun = new Date(sat);
        sun.setDate(sun.getDate() + 1);
        sun.setHours(23, 59, 59, 999);
        return { gte: sat, lte: sun };
      }

      default:
        return {};
    }
  }
}
