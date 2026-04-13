// prisma/seed.ts

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../src/config/env.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.interest.createMany({
    data: [
      // ─── Music ───────────────────────────────────────────────────────────
      { id: 'music_concerts', name: 'Music Concerts' },
      { id: 'music_festivals', name: 'Music Festivals' },
      { id: 'live_dj_sets', name: 'Live DJ Sets' },
      { id: 'open_mic_nights', name: 'Open Mic Nights' },
      { id: 'classical_music', name: 'Classical Music' },
      { id: 'gospel_worship', name: 'Gospel & Worship' },
      { id: 'afrobeats', name: 'Afrobeats' },
      { id: 'jazz_blues', name: 'Jazz & Blues' },

      // ─── Arts & Culture ──────────────────────────────────────────────────
      { id: 'arts_exhibitions', name: 'Arts Exhibitions' },
      { id: 'theatre_plays', name: 'Theatre & Plays' },
      { id: 'comedy_shows', name: 'Comedy Shows' },
      { id: 'film_screenings', name: 'Film Screenings' },
      { id: 'poetry_spoken_word', name: 'Poetry & Spoken Word' },
      { id: 'dance_performances', name: 'Dance Performances' },
      { id: 'fashion_shows', name: 'Fashion Shows' },
      { id: 'cultural_festivals', name: 'Cultural Festivals' },

      // ─── Tech & Business ─────────────────────────────────────────────────
      { id: 'tech_conferences', name: 'Tech Conferences' },
      { id: 'startup_pitches', name: 'Startup Pitches' },
      { id: 'hackathons', name: 'Hackathons' },
      { id: 'product_launches', name: 'Product Launches' },
      { id: 'networking_events', name: 'Networking Events' },
      { id: 'workshops', name: 'Workshops & Masterclasses' },
      { id: 'webinars', name: 'Webinars' },
      { id: 'career_fairs', name: 'Career Fairs' },

      // ─── Food & Drink ────────────────────────────────────────────────────
      { id: 'food_festivals', name: 'Food Festivals' },
      { id: 'wine_tasting', name: 'Wine Tasting' },
      { id: 'cocktail_events', name: 'Cocktail Events' },
      { id: 'pop_up_restaurants', name: 'Pop-up Restaurants' },
      { id: 'cooking_classes', name: 'Cooking Classes' },
      { id: 'brunch_events', name: 'Brunch Events' },

      // ─── Sports & Fitness ────────────────────────────────────────────────
      { id: 'sports_matches', name: 'Sports Matches' },
      { id: 'marathons_races', name: 'Marathons & Races' },
      { id: 'fitness_bootcamps', name: 'Fitness Bootcamps' },
      { id: 'yoga_wellness', name: 'Yoga & Wellness' },
      { id: 'outdoor_adventures', name: 'Outdoor Adventures' },
      { id: 'esports_gaming', name: 'Esports & Gaming' },
      { id: 'martial_arts', name: 'Martial Arts' },

      // ─── Education & Personal Development ───────────────────────────────
      { id: 'seminars', name: 'Seminars' },
      { id: 'book_clubs', name: 'Book Clubs' },
      { id: 'language_classes', name: 'Language Classes' },
      { id: 'leadership_summits', name: 'Leadership Summits' },
      { id: 'mental_health', name: 'Mental Health & Mindfulness' },
      { id: 'finance_investing', name: 'Finance & Investing' },

      // ─── Social & Lifestyle ──────────────────────────────────────────────
      { id: 'rooftop_parties', name: 'Rooftop Parties' },
      { id: 'beach_events', name: 'Beach Events' },
      { id: 'nightlife', name: 'Nightlife & Clubbing' },
      { id: 'speed_dating', name: 'Speed Dating' },
      { id: 'community_meetups', name: 'Community Meetups' },
      { id: 'volunteering', name: 'Volunteering' },
      { id: 'religious_events', name: 'Religious Events' },
      { id: 'lgbtq_events', name: 'LGBTQ+ Events' },

      // ─── Kids & Family ───────────────────────────────────────────────────
      { id: 'family_events', name: 'Family Events' },
      { id: 'kids_activities', name: 'Kids Activities' },
      { id: 'school_events', name: 'School Events' },

      // ─── Creative ────────────────────────────────────────────────────────
      { id: 'photography', name: 'Photography Events' },
      { id: 'creative_writing', name: 'Creative Writing' },
      { id: 'crafts_diy', name: 'Crafts & DIY' },
      { id: 'gaming_events', name: 'Board Game Events' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Interests seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
