import argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  UnauthorizedException,
} from '../lib/error.lib.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { EditProfileDto } from './dto/edit-profile.dto.js';
import { UpdateProfilePhotoDto } from './dto/update-profile-photo.dto.js';
import { UpdateEmailDto } from './dto/update-email.dto.js';
import { UsersHelper } from './users.helper.js';
import { mapUser } from './users.mapper.js';
import { EmailVerificationLib } from '../lib/email-verification.lib.js';

@Injectable()
export class UsersService {
  constructor(
    private usersHelper: UsersHelper,
    private emailVerificationLib: EmailVerificationLib,
  ) {}

  // ─── user-details ──────────────────────────────────────────────────────────────

  async userProfile(email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return mapUser(user);
  }

  // ─── change-password ──────────────────────────────────────────────────────────────

  async changePassword(dto: ChangePasswordDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please login with Google.',
      );
    }
    // Compare passwords
    const isMatch = await argon2.verify(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }
    const hashedPassword = await argon2.hash(dto.password);
    await this.usersHelper.update(user.id, {
      password: hashedPassword,
    });
    return {
      message:
        'Password has been reset. You can now log in with your new password.',
    };
  }

  // ─── edit-profile ──────────────────────────────────────────────────────────────

  async editProfile(dto: EditProfileDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updated = await this.usersHelper.update(user.id, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
    });

    return mapUser(updated);
  }

  // ─── update-profile-photo ──────────────────────────────────────────────────────────────

  async updateProfilePhoto(dto: UpdateProfilePhotoDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updated = await this.usersHelper.update(user.id, {
      profilePhotoURL: dto.profilePhotoURL,
    });

    return mapUser(updated);
  }

  // ─── update-email ──────────────────────────────────────────────────────────────

  async requestEmailUpdate(dto: UpdateEmailDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Only local accounts can change email
    if (user.authProvider !== 'LOCAL') {
      throw new BadRequestException(
        'Email cannot be changed for Google accounts.',
      );
    }

    // Confirm identity with current password
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await argon2.verify(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check new email is not already taken
    const emailTaken = await this.usersHelper.findByEmail(
      dto.newEmail.toLowerCase(),
    );
    if (emailTaken) {
      throw new BadRequestException('This email is already in use.');
    }

    // Send verification to the NEW email
    await this.emailVerificationLib.sendEmailChangeVerification(
      dto.newEmail.toLowerCase(),
      user.id,
    );

    return {
      message: `A verification link has been sent to ${dto.newEmail}. Please confirm to complete the email change.`,
    };
  }

  // ─── confirm-email-change ──────────────────────────────────────────────────────────────

  async confirmEmailChange(token: string) {
    const { userId, email, purpose } =
      this.emailVerificationLib.verifyToken(token);

    if (purpose !== 'email-change') {
      throw new BadRequestException('Invalid token purpose');
    }

    await this.usersHelper.update(userId, { email });

    return {
      message: 'Your email address has been updated successfully.',
    };
  }
}