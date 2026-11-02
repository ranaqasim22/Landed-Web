import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { InjectConnection } from '@nestjs/mongoose';
import { IdentityPatterns } from '@app/common';
import { Connection, STATES } from 'mongoose';

@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @MessagePattern(IdentityPatterns.health)
  check() {
    return {
      database: this.connection.readyState === STATES.connected,
    };
  }
}
