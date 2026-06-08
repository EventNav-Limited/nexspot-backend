/**
 * Timezone utility library.
 *
 * Provides country → IANA timezone mapping and conversion utilities
 * using Node's native Intl API — no external dependencies.
 *
 * Input conversion:  localToUTC(dateStr, timezone) → UTC Date
 * Output formatting: formatInTimezone(date, timezone) → display string
 */

// ─── Country → IANA timezone map ────────────────────────────────────────────
// Keys are lowercased country names. Add more as needed.
const COUNTRY_TIMEZONE: Record<string, string> = {
  // Africa
  nigeria: 'Africa/Lagos',
  ghana: 'Africa/Accra',
  kenya: 'Africa/Nairobi',
  'south africa': 'Africa/Johannesburg',
  ethiopia: 'Africa/Addis_Ababa',
  egypt: 'Africa/Cairo',
  tanzania: 'Africa/Dar_es_Salaam',
  uganda: 'Africa/Kampala',
  senegal: 'Africa/Dakar',
  rwanda: 'Africa/Kigali',
  cameroon: 'Africa/Douala',
  'ivory coast': 'Africa/Abidjan',
  "côte d'ivoire": 'Africa/Abidjan',
  zambia: 'Africa/Lusaka',
  zimbabwe: 'Africa/Harare',
  mozambique: 'Africa/Maputo',
  angola: 'Africa/Luanda',
  botswana: 'Africa/Gaborone',
  namibia: 'Africa/Windhoek',
  malawi: 'Africa/Blantyre',
  madagascar: 'Indian/Antananarivo',
  mauritius: 'Indian/Mauritius',
  sudan: 'Africa/Khartoum',
  'south sudan': 'Africa/Juba',
  somalia: 'Africa/Mogadishu',
  liberia: 'Africa/Monrovia',
  'sierra leone': 'Africa/Freetown',
  guinea: 'Africa/Conakry',
  niger: 'Africa/Niamey',
  mali: 'Africa/Bamako',
  'burkina faso': 'Africa/Ouagadougou',
  togo: 'Africa/Lome',
  benin: 'Africa/Porto-Novo',
  chad: 'Africa/Ndjamena',
  gabon: 'Africa/Libreville',
  congo: 'Africa/Brazzaville',
  drc: 'Africa/Kinshasa',
  'democratic republic of the congo': 'Africa/Kinshasa',
  morocco: 'Africa/Casablanca',
  algeria: 'Africa/Algiers',
  tunisia: 'Africa/Tunis',
  libya: 'Africa/Tripoli',
  // Europe
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  ireland: 'Europe/Dublin',
  germany: 'Europe/Berlin',
  france: 'Europe/Paris',
  spain: 'Europe/Madrid',
  italy: 'Europe/Rome',
  netherlands: 'Europe/Amsterdam',
  belgium: 'Europe/Brussels',
  switzerland: 'Europe/Zurich',
  portugal: 'Europe/Lisbon',
  sweden: 'Europe/Stockholm',
  norway: 'Europe/Oslo',
  denmark: 'Europe/Copenhagen',
  finland: 'Europe/Helsinki',
  poland: 'Europe/Warsaw',
  // Americas
  'united states': 'America/New_York',
  usa: 'America/New_York',
  canada: 'America/Toronto',
  brazil: 'America/Sao_Paulo',
  mexico: 'America/Mexico_City',
  // Asia / Middle East
  india: 'Asia/Kolkata',
  china: 'Asia/Shanghai',
  japan: 'Asia/Tokyo',
  'south korea': 'Asia/Seoul',
  singapore: 'Asia/Singapore',
  uae: 'Asia/Dubai',
  'united arab emirates': 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh',
  turkey: 'Europe/Istanbul',
  israel: 'Asia/Jerusalem',
  // Oceania
  australia: 'Australia/Sydney',
  'new zealand': 'Pacific/Auckland',
};

// ─── City → IANA timezone map ─────────────────────────────────────────────────
// Used for countries that span multiple timezones.
// Keys are lowercased city names. Add more as needed.
const CITY_TIMEZONE: Record<string, string> = {
  // United States
  'new york': 'America/New_York',
  'new york city': 'America/New_York',
  nyc: 'America/New_York',
  boston: 'America/New_York',
  miami: 'America/New_York',
  atlanta: 'America/New_York',
  washington: 'America/New_York',
  philadelphia: 'America/New_York',
  charlotte: 'America/New_York',
  detroit: 'America/New_York',
  chicago: 'America/Chicago',
  houston: 'America/Chicago',
  dallas: 'America/Chicago',
  austin: 'America/Chicago',
  minneapolis: 'America/Chicago',
  kansas: 'America/Chicago',
  'new orleans': 'America/Chicago',
  denver: 'America/Denver',
  salt_lake_city: 'America/Denver',
  phoenix: 'America/Phoenix',
  'los angeles': 'America/Los_Angeles',
  la: 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles',
  seattle: 'America/Los_Angeles',
  'las vegas': 'America/Los_Angeles',
  portland: 'America/Los_Angeles',
  san_diego: 'America/Los_Angeles',
  honolulu: 'Pacific/Honolulu',
  anchorage: 'America/Anchorage',
  // Canada
  toronto: 'America/Toronto',
  ottawa: 'America/Toronto',
  montreal: 'America/Toronto',
  hamilton: 'America/Toronto',
  winnipeg: 'America/Winnipeg',
  calgary: 'America/Edmonton',
  edmonton: 'America/Edmonton',
  vancouver: 'America/Vancouver',
  victoria: 'America/Vancouver',
  halifax: 'America/Halifax',
  // Australia
  sydney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
  canberra: 'Australia/Sydney',
  brisbane: 'Australia/Brisbane',
  'gold coast': 'Australia/Brisbane',
  perth: 'Australia/Perth',
  adelaide: 'Australia/Adelaide',
  darwin: 'Australia/Darwin',
  hobart: 'Australia/Hobart',
  // Brazil
  'são paulo': 'America/Sao_Paulo',
  'sao paulo': 'America/Sao_Paulo',
  'rio de janeiro': 'America/Sao_Paulo',
  brasilia: 'America/Sao_Paulo',
  salvador: 'America/Bahia',
  fortaleza: 'America/Fortaleza',
  belem: 'America/Belem',
  manaus: 'America/Manaus',
  'rio branco': 'America/Rio_Branco',
  // Russia
  moscow: 'Europe/Moscow',
  'saint petersburg': 'Europe/Moscow',
  'st. petersburg': 'Europe/Moscow',
  ekaterinburg: 'Asia/Yekaterinburg',
  novosibirsk: 'Asia/Novosibirsk',
  krasnoyarsk: 'Asia/Krasnoyarsk',
  irkutsk: 'Asia/Irkutsk',
  yakutsk: 'Asia/Yakutsk',
  vladivostok: 'Asia/Vladivostok',
  magadan: 'Asia/Magadan',
  // Mexico
  'mexico city': 'America/Mexico_City',
  guadalajara: 'America/Mexico_City',
  monterrey: 'America/Monterrey',
  cancun: 'America/Cancun',
  tijuana: 'America/Tijuana',
  // Indonesia
  jakarta: 'Asia/Jakarta',
  surabaya: 'Asia/Jakarta',
  bandung: 'Asia/Jakarta',
  bali: 'Asia/Makassar',
  makassar: 'Asia/Makassar',
  manado: 'Asia/Makassar',
  jayapura: 'Asia/Jayapura',
  // China (officially one zone, but here for completeness)
  beijing: 'Asia/Shanghai',
  shanghai: 'Asia/Shanghai',
  guangzhou: 'Asia/Shanghai',
  shenzhen: 'Asia/Shanghai',
  chengdu: 'Asia/Shanghai',
  urumqi: 'Asia/Urumqi',
};

/**
 * Returns the IANA timezone string for a country name.
 * Falls back to 'UTC' if the country is not found in the map.
 */
export function getTimezoneFromCountry(country: string): string {
  return COUNTRY_TIMEZONE[country.trim().toLowerCase()] ?? 'UTC';
}

/**
 * Returns the IANA timezone string from a city+country pair.
 *
 * Lookup order:
 * 1. City name (covers multi-timezone countries like USA, Canada, Australia)
 * 2. Country name (covers single-timezone countries like Nigeria, UK)
 * 3. Falls back to 'UTC'
 *
 * @example
 * getTimezoneFromLocation('Lagos', 'Nigeria')       → 'Africa/Lagos'
 * getTimezoneFromLocation('Los Angeles', 'USA')     → 'America/Los_Angeles'
 * getTimezoneFromLocation('Sydney', 'Australia')    → 'Australia/Sydney'
 * getTimezoneFromLocation(undefined, 'Germany')     → 'Europe/Berlin'
 */
export function getTimezoneFromLocation(
  city?: string | null,
  country?: string | null,
): string {
  if (city) {
    const cityMatch = CITY_TIMEZONE[city.trim().toLowerCase()];
    if (cityMatch) return cityMatch;
  }
  if (country) {
    const countryMatch = COUNTRY_TIMEZONE[country.trim().toLowerCase()];
    if (countryMatch) return countryMatch;
  }
  return 'UTC';
}

/**
 * Returns the UTC offset in milliseconds for an IANA timezone at the given
 * reference time. Positive values are east of UTC (e.g. Africa/Lagos = +3600000).
 */
function getUTCOffsetMs(timezone: string, referenceDate: Date): number {
  const utcTime = new Date(
    referenceDate.toLocaleString('en-US', { timeZone: 'UTC' }),
  ).getTime();
  const localTime = new Date(
    referenceDate.toLocaleString('en-US', { timeZone: timezone }),
  ).getTime();
  return localTime - utcTime;
}

/**
 * Converts a local date string (without timezone info) to a UTC Date by
 * interpreting the string as being in the given IANA timezone.
 *
 * If the string already contains timezone info (Z, +HH:MM, -HH:MM), it is
 * parsed as-is and the timezone parameter is ignored.
 *
 * @example
 * // Lagos organizer enters "2026-12-16T10:30:00" (local time)
 * localToUTC("2026-12-16T10:30:00", "Africa/Lagos")
 * // → Date representing 2026-12-16T09:30:00Z
 */
export function localToUTC(localDateStr: string, timezone: string): Date {
  // If the string already has timezone info, JavaScript handles it correctly
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(localDateStr)) {
    return new Date(localDateStr);
  }

  // Parse as if it's UTC to get a reference point
  const approximateUTC = new Date(localDateStr + 'Z');

  // Get the offset at approximately this point in time
  const offsetMs = getUTCOffsetMs(timezone, approximateUTC);

  // Actual UTC = local time − offset
  return new Date(approximateUTC.getTime() - offsetMs);
}

/**
 * Formats a UTC Date as a human-readable date+time string in the given timezone.
 * e.g. "Dec 16 | 10:30 AM – 1:30 PM"
 */
export function formatDateDisplay(
  start: Date,
  end: Date,
  timezone = 'UTC',
): string {
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
  }).format(start);

  const startTime = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(start);

  const endTime = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(end);

  return `${dateStr} | ${startTime} – ${endTime}`;
}

/**
 * Formats a single UTC Date as a short date+time string in the given timezone.
 * e.g. "6 Jun | 10:30 AM"
 * Used for non-event timestamps (e.g. elevation request createdAt).
 */
export function formatTimestamp(date: Date, timezone = 'UTC'): string {
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
  }).format(date);

  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${dateStr} | ${time}`;
}
