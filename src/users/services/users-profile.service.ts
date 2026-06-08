import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { UsersHelper } from '../../users/users.helper.js';
import { EmailVerificationLib } from '../../lib/email-verification.lib.js';
import { mapUser } from '../../users/users.mapper.js';
import {
  BadRequestException,
  UnauthorizedException,
} from '../../lib/error.lib.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { EditProfileDto } from '../dto/edit-profile.dto.js';
import { UpdateProfilePhotoDto } from '../dto/update-profile-photo.dto.js';
import { UpdateEmailDto } from '../dto/update-email.dto.js';

@Injectable()
export class UsersProfileService {
  constructor(
    private usersHelper: UsersHelper,
    private emailVerificationLib: EmailVerificationLib,
  ) {}

  async userProfile(email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return mapUser(user);
  }

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

    const isMatch = await argon2.verify(user.password, dto.oldPassword);
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

  async requestEmailUpdate(dto: UpdateEmailDto, email: string) {
    const user = await this.usersHelper.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.authProvider !== 'LOCAL') {
      throw new BadRequestException(
        'Email cannot be changed for Google accounts.',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await argon2.verify(user.password, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const emailTaken = await this.usersHelper.findByEmail(
      dto.newEmail.toLowerCase(),
    );
    if (emailTaken) {
      throw new BadRequestException('This email is already in use.');
    }

    await this.emailVerificationLib.sendEmailChangeVerification(
      dto.newEmail.toLowerCase(),
      user.id,
    );

    return {
      message: `A verification link has been sent to ${dto.newEmail}. Please confirm to complete the email change.`,
    };
  }

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
