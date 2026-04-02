// src/lib/regex.lib.ts

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD') // decompose accented chars: é → e + ́
    .replace(/[\u0300-\u036f]/g, '') // strip accent marks
    .replace(/[^a-z0-9\s-]/g, '') // remove anything not alphanumeric, space, or hyphen
    .replace(/[\s_]+/g, '-') // spaces and underscores → hyphen
    .replace(/-{2,}/g, '-') // collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}
