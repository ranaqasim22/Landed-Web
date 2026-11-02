import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { configureHttp } from './common/configure-http.js';
import { CorsSocketAdapter } from './community/cors-socket.adapter.js';
import { GatewayModule } from './gateway.module.js';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  configureHttp(app);
  app.useWebSocketAdapter(new CorsSocketAdapter(app));

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Landed API').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.get<string>('PORT') ?? 3000);
}
await bootstrap();
