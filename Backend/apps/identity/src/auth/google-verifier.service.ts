import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
}

@Injectable()
export class GoogleVerifierService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    // Without an audience Google would accept tokens issued to any other app.
    const audience = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!audience) {
      throw new ServiceUnavailableException(
        "Google sign-in isn't available right now",
      );
    }

    const payload = await this.client
      .verifyIdToken({ idToken, audience })
      .then((ticket) => ticket.getPayload())
      .catch(() => undefined);

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException("Google couldn't confirm your account");
    }
    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      fullName: payload.name ?? payload.email.split('@')[0],
    };
  }
}
