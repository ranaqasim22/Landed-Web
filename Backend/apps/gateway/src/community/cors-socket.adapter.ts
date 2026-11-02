import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

// Decorator options are fixed before config loads, so the allowed site is added here.
export class CorsSocketAdapter extends IoAdapter {
  private readonly frontendUrl: string;

  constructor(app: INestApplication) {
    super(app);
    this.frontendUrl = app
      .get(ConfigService)
      .getOrThrow<string>('FRONTEND_URL');
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.frontendUrl, credentials: true },
    } as ServerOptions) as Server;
  }
}
