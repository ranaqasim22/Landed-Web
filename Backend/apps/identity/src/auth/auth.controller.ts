import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IdentityPatterns } from '@app/common';
import { AuthService } from './auth.service.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(IdentityPatterns.signup)
  async signup(
    @Payload() input: { fullName: string; email: string; password: string },
  ) {
    await this.auth.signup(input);
    return {};
  }

  @MessagePattern(IdentityPatterns.login)
  login(@Payload() input: { email: string; password: string }) {
    return this.auth.login(input);
  }

  @MessagePattern(IdentityPatterns.google)
  google(@Payload() input: { idToken: string }) {
    return this.auth.loginWithGoogle(input.idToken);
  }

  @MessagePattern(IdentityPatterns.refresh)
  refresh(@Payload() input: { refreshToken: string }) {
    return this.auth.refresh(input.refreshToken);
  }

  @MessagePattern(IdentityPatterns.logout)
  async logout(@Payload() input: { refreshToken: string }) {
    await this.auth.logout(input.refreshToken);
    return {};
  }

  @MessagePattern(IdentityPatterns.verifyEmail)
  async verifyEmail(@Payload() input: { token: string }) {
    await this.auth.verifyEmail(input.token);
    return {};
  }

  @MessagePattern(IdentityPatterns.resendVerification)
  async resendVerification(@Payload() input: { email: string }) {
    await this.auth.resendVerification(input.email);
    return {};
  }

  @MessagePattern(IdentityPatterns.forgotPassword)
  async forgotPassword(@Payload() input: { email: string }) {
    await this.auth.forgotPassword(input.email);
    return {};
  }

  @MessagePattern(IdentityPatterns.resetPassword)
  async resetPassword(@Payload() input: { token: string; password: string }) {
    await this.auth.resetPassword(input);
    return {};
  }

  @MessagePattern(IdentityPatterns.deleteAccount)
  async deleteAccount(@Payload() input: { userId: string }) {
    await this.auth.deleteAccount(input.userId);
    return {};
  }
}
