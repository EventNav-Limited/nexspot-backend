import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../config/env.js';
import { UsersHelper } from '../../users/users.helper.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersHelper: UsersHelper) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.ACCESS_SECRET,
    });
  }

  async validate(payload) {
    const user = await this.usersHelper.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return { userId: user.id, email: user.email, role: user.role };
  }
}
