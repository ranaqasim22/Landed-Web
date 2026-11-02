import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { callService, IDENTITY_SERVICE, IdentityPatterns } from '@app/common';
import type { AuthSession } from '@app/common';
import type { Request, Response } from 'express';
import {
  EmailDto,
  GoogleLoginDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
} from './dto/auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

const REFRESH_COOKIE = 'landed_refresh';

@ApiTags('auth')
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy,
    private readonly config: ConfigService,
  ) {}

  @Post('signup')
  async signup(@Body() body: SignupDto) {
    await callService(this.identity, IdentityPatterns.signup, body);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await callService<AuthSession>(
      this.identity,
      IdentityPatterns.login,
      body,
    );
    return this.toClientSession(session, response);
  }

  @Post('google')
  @HttpCode(200)
  async google(
    @Body() body: GoogleLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await callService<AuthSession>(
      this.identity,
      IdentityPatterns.google,
      body,
    );
    return this.toClientSession(session, response);
  }

  // Runs on every page load, so it needs more room than the login routes.
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readRefreshToken(request);
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Your session has ended. Please log in again',
      );
    }
    const session = await callService<AuthSession>(
      this.identity,
      IdentityPatterns.refresh,
      { refreshToken },
    );
    return this.toClientSession(session, response);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readRefreshToken(request);
    if (refreshToken) {
      await callService(this.identity, IdentityPatterns.logout, {
        refreshToken,
      });
    }
    this.clearRefreshCookie(response);
  }

  // Opened from the email, so it answers with a redirect to the site rather than JSON.
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() response: Response) {
    const verified = await callService(
      this.identity,
      IdentityPatterns.verifyEmail,
      { token },
    )
      .then(() => true)
      .catch(() => false);
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    response.redirect(`${frontendUrl}/login?verified=${verified}`);
  }

  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() body: EmailDto) {
    await callService(this.identity, IdentityPatterns.resendVerification, body);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() body: EmailDto) {
    await callService(this.identity, IdentityPatterns.forgotPassword, body);
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await callService(this.identity, IdentityPatterns.resetPassword, body);
  }

  @Delete('account')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await callService(this.identity, IdentityPatterns.deleteAccount, {
      userId: request.userId,
    });
    this.clearRefreshCookie(response);
  }

  // The refresh token only ever travels in the httpOnly cookie, never in a response body.
  private toClientSession(
    { refreshToken, refreshExpiresAt, ...session }: AuthSession,
    response: Response,
  ) {
    response.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.refreshCookieOptions(),
      expires: new Date(refreshExpiresAt),
    });
    return session;
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
  }

  private refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    } as const;
  }

  private readRefreshToken(request: Request) {
    return (request.cookies as Record<string, string | undefined>)[
      REFRESH_COOKIE
    ];
  }
}
