import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { AsyncMicroserviceOptions } from '@nestjs/microservices';
import { redisTransport, RpcExceptionsFilter } from '@app/common';
import { Logger } from 'nestjs-pino';
import { CommunityModule } from './community.module.js';
import { seed } from './seed/seed.js';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    CommunityModule,
    {
      inject: [ConfigService],
      useFactory: redisTransport,
      bufferLogs: true,
    },
  );
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new RpcExceptionsFilter());
  await app.listen();
}

await (process.argv.includes('--seed') ? seed() : bootstrap());
