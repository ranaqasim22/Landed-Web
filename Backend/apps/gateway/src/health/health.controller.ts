import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SkipThrottle } from '@nestjs/throttler';
import { callService, IDENTITY_SERVICE, IdentityPatterns } from '@app/common';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(IDENTITY_SERVICE) private readonly identity: ClientProxy,
  ) {}

  @Get()
  async check() {
    const { database } = await callService<{ database: boolean }>(
      this.identity,
      IdentityPatterns.health,
      {},
    );
    if (!database) {
      throw new ServiceUnavailableException('Identity database is down');
    }
    return { status: 'ok', services: { identity: 'up' } };
  }
}
