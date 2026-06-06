// prisma/seed.ts

import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../src/config/env.js';
import argon2 from 'argon2';

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

  await prisma.categories.createMany({
    data: [
      { id: 'cat_music', name: 'Music', slug: 'music', iconURL: '' },
      {
        id: 'cat_arts_culture',
        name: 'Arts & Culture',
        slug: 'arts-culture',
        iconURL: '',
      },
      {
        id: 'cat_tech_business',
        name: 'Tech & Business',
        slug: 'tech-business',
        iconURL: '',
      },
      {
        id: 'cat_food_drink',
        name: 'Food & Drink',
        slug: 'food-drink',
        iconURL: '',
      },
      {
        id: 'cat_sports_fitness',
        name: 'Sports & Fitness',
        slug: 'sports-fitness',
        iconURL: '',
      },
      {
        id: 'cat_education',
        name: 'Education & Personal Dev',
        slug: 'education-personal-dev',
        iconURL: '',
      },
      {
        id: 'cat_social',
        name: 'Social & Lifestyle',
        slug: 'social-lifestyle',
        iconURL: '',
      },
      {
        id: 'cat_family',
        name: 'Kids & Family',
        slug: 'kids-family',
        iconURL: '',
      },
      { id: 'cat_creative', name: 'Creative', slug: 'creative', iconURL: '' },
      {
        id: 'cat_religion',
        name: 'Faith & Spirituality',
        slug: 'faith-spirituality',
        iconURL: '',
      },
      {
        id: 'cat_charity',
        name: 'Charity & Causes',
        slug: 'charity-causes',
        iconURL: '',
      },
      {
        id: 'cat_travel',
        name: 'Travel & Adventure',
        slug: 'travel-adventure',
        iconURL: '',
      },
      {
        id: 'cat_health',
        name: 'Health & Wellness',
        slug: 'health-wellness',
        iconURL: '',
      },
      {
        id: 'cat_nightlife',
        name: 'Nightlife & Parties',
        slug: 'nightlife-parties',
        iconURL: '',
      },
      { id: 'cat_other', name: 'Other', slug: 'other', iconURL: '' },
    ],
    skipDuplicates: true,
  });

  await prisma.formats.createMany({
    data: [
      { id: 'fmt_conference', name: 'Conference', slug: 'conference' },
      {
        id: 'fmt_concert',
        name: 'Concert & Performance',
        slug: 'concert-performance',
      },
      { id: 'fmt_festival', name: 'Festival & Fair', slug: 'festival-fair' },
      {
        id: 'fmt_workshop',
        name: 'Workshop & Masterclass',
        slug: 'workshop-masterclass',
      },
      { id: 'fmt_seminar', name: 'Seminar & Talk', slug: 'seminar-talk' },
      {
        id: 'fmt_networking',
        name: 'Networking Event',
        slug: 'networking-event',
      },
      { id: 'fmt_hackathon', name: 'Hackathon', slug: 'hackathon' },
      {
        id: 'fmt_exhibition',
        name: 'Exhibition & Showcase',
        slug: 'exhibition-showcase',
      },
      {
        id: 'fmt_sports',
        name: 'Sports & Competition',
        slug: 'sports-competition',
      },
      {
        id: 'fmt_community',
        name: 'Community Meetup',
        slug: 'community-meetup',
      },
      { id: 'fmt_party', name: 'Party & Social', slug: 'party-social' },
      { id: 'fmt_retreat', name: 'Retreat & Camp', slug: 'retreat-camp' },
      {
        id: 'fmt_fundraiser',
        name: 'Fundraiser & Charity',
        slug: 'fundraiser-charity',
      },
      { id: 'fmt_screening', name: 'Film & Screening', slug: 'film-screening' },
      {
        id: 'fmt_launch',
        name: 'Product & Brand Launch',
        slug: 'product-brand-launch',
      },
      {
        id: 'fmt_religious',
        name: 'Religious Gathering',
        slug: 'religious-gathering',
      },
      { id: 'fmt_popup', name: 'Pop-up', slug: 'pop-up' },
      { id: 'fmt_other', name: 'Other', slug: 'other' },
    ],
    skipDuplicates: true,
  });

  await prisma.interestcategory.createMany({
    data: [
      // Music
      { interestId: 'music_concerts', categoryId: 'cat_music' },
      { interestId: 'music_festivals', categoryId: 'cat_music' },
      { interestId: 'live_dj_sets', categoryId: 'cat_music' },
      { interestId: 'open_mic_nights', categoryId: 'cat_music' },
      { interestId: 'classical_music', categoryId: 'cat_music' },
      { interestId: 'gospel_worship', categoryId: 'cat_music' },
      { interestId: 'afrobeats', categoryId: 'cat_music' },
      { interestId: 'jazz_blues', categoryId: 'cat_music' },

      // Arts & Culture
      { interestId: 'arts_exhibitions', categoryId: 'cat_arts_culture' },
      { interestId: 'theatre_plays', categoryId: 'cat_arts_culture' },
      { interestId: 'comedy_shows', categoryId: 'cat_arts_culture' },
      { interestId: 'film_screenings', categoryId: 'cat_arts_culture' },
      { interestId: 'poetry_spoken_word', categoryId: 'cat_arts_culture' },
      { interestId: 'dance_performances', categoryId: 'cat_arts_culture' },
      { interestId: 'fashion_shows', categoryId: 'cat_arts_culture' },
      { interestId: 'cultural_festivals', categoryId: 'cat_arts_culture' },

      // Tech & Business
      { interestId: 'tech_conferences', categoryId: 'cat_tech_business' },
      { interestId: 'startup_pitches', categoryId: 'cat_tech_business' },
      { interestId: 'hackathons', categoryId: 'cat_tech_business' },
      { interestId: 'product_launches', categoryId: 'cat_tech_business' },
      { interestId: 'networking_events', categoryId: 'cat_tech_business' },
      { interestId: 'workshops', categoryId: 'cat_tech_business' },
      { interestId: 'webinars', categoryId: 'cat_tech_business' },
      { interestId: 'career_fairs', categoryId: 'cat_tech_business' },

      // Food & Drink
      { interestId: 'food_festivals', categoryId: 'cat_food_drink' },
      { interestId: 'wine_tasting', categoryId: 'cat_food_drink' },
      { interestId: 'cocktail_events', categoryId: 'cat_food_drink' },
      { interestId: 'pop_up_restaurants', categoryId: 'cat_food_drink' },
      { interestId: 'cooking_classes', categoryId: 'cat_food_drink' },
      { interestId: 'brunch_events', categoryId: 'cat_food_drink' },

      // Sports & Fitness
      { interestId: 'sports_matches', categoryId: 'cat_sports_fitness' },
      { interestId: 'marathons_races', categoryId: 'cat_sports_fitness' },
      { interestId: 'fitness_bootcamps', categoryId: 'cat_sports_fitness' },
      { interestId: 'yoga_wellness', categoryId: 'cat_sports_fitness' },
      { interestId: 'outdoor_adventures', categoryId: 'cat_sports_fitness' },
      { interestId: 'esports_gaming', categoryId: 'cat_sports_fitness' },
      { interestId: 'martial_arts', categoryId: 'cat_sports_fitness' },

      // Education & Personal Dev
      { interestId: 'seminars', categoryId: 'cat_education' },
      { interestId: 'book_clubs', categoryId: 'cat_education' },
      { interestId: 'language_classes', categoryId: 'cat_education' },
      { interestId: 'leadership_summits', categoryId: 'cat_education' },
      { interestId: 'mental_health', categoryId: 'cat_health' },
      { interestId: 'finance_investing', categoryId: 'cat_education' },

      // Social & Lifestyle
      { interestId: 'rooftop_parties', categoryId: 'cat_nightlife' },
      { interestId: 'beach_events', categoryId: 'cat_social' },
      { interestId: 'nightlife', categoryId: 'cat_nightlife' },
      { interestId: 'speed_dating', categoryId: 'cat_social' },
      { interestId: 'community_meetups', categoryId: 'cat_social' },
      { interestId: 'volunteering', categoryId: 'cat_charity' },
      { interestId: 'religious_events', categoryId: 'cat_religion' },
      { interestId: 'lgbtq_events', categoryId: 'cat_social' },

      // Kids & Family
      { interestId: 'family_events', categoryId: 'cat_family' },
      { interestId: 'kids_activities', categoryId: 'cat_family' },
      { interestId: 'school_events', categoryId: 'cat_family' },

      // Creative
      { interestId: 'photography', categoryId: 'cat_creative' },
      { interestId: 'creative_writing', categoryId: 'cat_creative' },
      { interestId: 'crafts_diy', categoryId: 'cat_creative' },
      { interestId: 'gaming_events', categoryId: 'cat_creative' },
    ],
    skipDuplicates: true,
  });

  await prisma.users.upsert({
    where: { email: process.env.ADMIN_EMAIL },
    update: {},
    create: {
      id: 'usr_admin_01',
      firstName: 'Nexspot',
      lastName: 'Admin',
      email: env.ADMIN_EMAIL,
      password: await argon2.hash(env.ADMIN_PASSWORD),
      role: 'ADMIN',
      isActive: true,
      onboardingCompleted: true,
      authProvider: 'LOCAL',
      profilePhotoURL: `https://ui-avatars.com/api/?name=Nexspot+Admin`,
    } as Prisma.UsersCreateInput,
  });

  console.log('seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
