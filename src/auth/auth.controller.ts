import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { env } from '../config/env.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import type { Response, Request } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';
import { successResponse } from '../lib/response.lib.js';
import { GoogleAuthGuard } from './guard/google-auth.guard.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';

const REFRESH_COOKIE = 'refresh_token';
const DEVICE_COOKIE = 'device_id';

const refreshCookieOptions = {
  httpOnly: false, // JS cannot read it
  secure: false, // HTTPS only
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/auth', // only sent to /auth/* routes
};

const deviceCookieOptions = {
  httpOnly: false,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 365 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user account. Sends a verification email on success.
   * Sets refresh_token and device_id cookies on the response.
   *
   * @route POST /auth/register
   *
   * @param dto - { firstName, lastName, email, password, profilePhotoURL? }
   *
   * @returns {SuccessResponse<{ user: User; access_token: string }>}
   *
   * @throws {409} CONFLICT - An account with this email already exists
   * @throws {500} INTERNAL - Failed to send verification email (user rolled back)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, device_id, ...data } =
      await this.authService.register(dto);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    return successResponse(data);
  }

  /**
   * Authenticate with email and password. Creates or updates the device
   * session. Sets refresh_token and device_id cookies on the response.
   *
   * @route POST /auth/login
   *
   * @param dto - { email, password }
   *
   * @returns {SuccessResponse<{ user: User; access_token: string }>}
   *
   * @throws {401} UNAUTHORIZED - Invalid email or password
   * @throws {401} UNAUTHORIZED - Account registered via Google — must use Google login
   * @throws {401} UNAUTHORIZED - Account not yet verified (verification email resent)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let device_id = req.cookies.device_id;

    if (!device_id) {
      device_id = crypto.randomUUID();
    }

    const { refresh_token, ...data } = await this.authService.login(
      dto,
      device_id,
    );

    // Set refresh_token as HTTP-only, secure cookie
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);

    return successResponse(data);
  }

  /**
   * Verify a user's email address using the signed token sent by email.
   * Activates the account (isActive → true).
   *
   * @route GET /auth/verify-email
   *
   * @param token - Signed verification token from the email link
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {400} BAD_REQUEST - Invalid or expired token
   * @throws {400} BAD_REQUEST - Token purpose is not 'registration'
   */
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verify(@Query('token') token: string) {
    console.log('hohoho');
    await this.authService.verify(token);
    return successResponse(null);
  }

  /**
   * Initiate the Google OAuth 2.0 flow. The guard redirects the browser
   * to Google's authorization page automatically — nothing is returned here.
   *
   * @route GET /auth/google
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google automatically, nothing to do here
  }

  /**
   * OAuth 2.0 callback from Google. Looks up or creates the user account,
   * generates tokens, sets cookies, and redirects the browser to the
   * frontend with the access_token in the query string.
   *
   * @route GET /auth/google/callback
   *
   * @returns Redirect → {FRONTEND_URL}?access_token=<jwt>
   *
   * @throws {409} CONFLICT - Email already registered as a LOCAL account
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { refresh_token, device_id, ...data } =
      await this.authService.googleLogin(req.user as any);

    res.cookie(DEVICE_COOKIE, device_id, deviceCookieOptions);
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);

    // Redirect to frontend with access token in query param
    return res.redirect(
      `${env.FRONTEND_URL}?access_token=${data.payload.access_token}`,
    );
  }

  /**
   * Send a password reset email to the provided address.
   *
   * @route POST /auth/forgot-password
   *
   * @param dto - { email }
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {400} BAD_REQUEST - Email not found in the system
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email!);
    return successResponse(null);
  }

  /**
   * Reset the user's password using the signed token from the forgot-password
   * email link.
   *
   * @route POST /auth/reset-password
   *
   * @param token - Signed reset token from the email link (query param)
   * @param dto   - { password } — the new password (min 8 characters)
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {400} BAD_REQUEST - Invalid or expired token
   * @throws {400} BAD_REQUEST - Token purpose is not 'forgot-password'
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ForgotPasswordDto,
  ) {
    await this.authService.resetPassword(token, dto.password!);
    return successResponse(null);
  }

  /**
   * Issue a new access token using the refresh_token cookie. Does not
   * rotate the refresh token — only a new access token is returned.
   *
   * @route POST /auth/refresh
   * @security CookieAuth (refresh_token)
   *
   * @returns {SuccessResponse<string>} The new access_token string
   *
   * @throws {401} UNAUTHORIZED - No refresh_token cookie present
   * @throws {401} UNAUTHORIZED - Invalid or expired refresh token JWT
   * @throws {401} UNAUTHORIZED - Session not found in database
   * @throws {401} UNAUTHORIZED - Session has expired (DB check)
   * @throws {401} UNAUTHORIZED - Token hash mismatch — possible token reuse detected
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refresh_token = req.cookies?.refresh_token; // ← was 'refreshToken', cookie is set as 'refresh_token'

    if (!refresh_token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { access_token } = await this.authService.refresh(refresh_token);

    return successResponse(access_token);
  }

  /**
   * Log out the authenticated user. Deletes the server-side session and
   * clears the refresh_token and device_id cookies.
   *
   * @route POST /auth/logout
   * @security BearerAuth
   *
   * @returns {SuccessResponse<null>}
   *
   * @throws {401} UNAUTHORIZED - Missing or invalid access token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh_token = req.cookies?.refresh_token;

    if (!refresh_token) {
      console.log('no token');
    }
    await this.authService.logout(refresh_token);

    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.clearCookie(DEVICE_COOKIE, deviceCookieOptions);

    return successResponse(null);
  }
}
