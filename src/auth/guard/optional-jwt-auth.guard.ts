import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — attaches req.user when a valid Bearer token is present,
 * but does NOT throw when the token is absent or invalid.
 * Use on routes that are public but can offer richer responses to authenticated users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(_err: any, user: any) {
    // Unlike JwtAuthGuard, silently return null instead of throwing
    return user ?? null;
  }
}
