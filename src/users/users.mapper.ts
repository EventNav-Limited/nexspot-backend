// src/users/users.mapper.ts

import { Users } from '../generated/prisma/client.js';

export function mapUser(user: Users) {
  return {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    role: user.role,
    profile_photo_url: user.profilePhotoURL,
    onboarding_completed: user.onboardingCompleted,
    created_at: user.createdAt,
  };
}
