import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SkipThrottle } from '@nestjs/throttler';
import {
  callService,
  COMMUNITY_SERVICE,
  CommunityPatterns,
  IDENTITY_SERVICE,
  IdentityPatterns,
} from '@app/common';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy,
    @Inject(COMMUNITY_SERVICE) private readonly community: ClientProxy,
  ) {}

  @Get()
  async check() {
    const [identity, community] = await Promise.all([
      callService<{ database: boolean }>(
        this.identity,
        IdentityPatterns.health,
        {},
      ),
      callService<{ database: boolean }>(
        this.community,
        CommunityPatterns.health,
        {},
      ),
    ]);
    if (!identity.database) {
      throw new ServiceUnavailableException('Identity database is down');
    }
    if (!community.database) {
      throw new ServiceUnavailableException('Community database is down');
    }
    return { status: 'ok', services: { identity: 'up', community: 'up' } };
  }
}
