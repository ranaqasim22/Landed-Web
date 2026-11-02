import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import { FEED_ROOM, POST_NEW_EVENT } from '@app/common';
import type { AccessTokenPayload, PostNewEvent } from '@app/common';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class FeedEventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth as { token?: string }).token;
    try {
      await this.jwt.verifyAsync<AccessTokenPayload>(token ?? '');
      await client.join(FEED_ROOM);
    } catch {
      client.disconnect();
    }
  }

  announcePost(event: PostNewEvent) {
    this.server.to(FEED_ROOM).emit(POST_NEW_EVENT, event);
  }
}
