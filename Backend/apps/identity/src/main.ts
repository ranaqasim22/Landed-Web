import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { AsyncMicroserviceOptions } from '@nestjs/microservices';
import { redisTransport, RpcExceptionsFilter } from '@app/common';
import { Logger } from 'nestjs-pino';
import { IdentityModule } from './identity.module.js';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    IdentityModule,
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
await bootstrap();
