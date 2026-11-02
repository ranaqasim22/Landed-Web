import {
  Catch,
  HttpException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ClientProxy, Transport } from '@nestjs/microservices';
import type { RedisOptions } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';

const RPC_TIMEOUT_MS = 5000;

interface RpcError {
  statusCode: number;
  message: string;
}

function isRpcError(error: unknown): error is RpcError {
  return typeof (error as RpcError | null)?.statusCode === 'number';
}

export function redisTransport(config: ConfigService): RedisOptions {
  return {
    transport: Transport.REDIS,
    options: {
      host: config.getOrThrow<string>('REDIS_HOST'),
      port: Number(config.getOrThrow<string>('REDIS_PORT')),
    },
  };
}

// Turns a service's error back into an HTTP error. Anything else means the service
// could not answer at all, which callers should see as a temporary outage.
export function callService<T>(
  client: ClientProxy,
  pattern: string,
  payload: unknown,
): Promise<T> {
  return firstValueFrom(
    client.send<T>(pattern, payload).pipe(
      timeout(RPC_TIMEOUT_MS),
      catchError((error: unknown) =>
        throwError(() =>
          isRpcError(error)
            ? new HttpException(error.message, error.statusCode)
            : new ServiceUnavailableException(
                "We can't reach this service right now. Try again in a moment",
              ),
        ),
      ),
    ),
  );
}

// Services have no HTTP layer, so their exceptions are flattened into a shape
// that survives the trip over Redis and that callService understands.
@Catch()
export class RpcExceptionsFilter {
  private readonly logger = new Logger(RpcExceptionsFilter.name);

  catch(exception: unknown) {
    if (exception instanceof HttpException) {
      const error: RpcError = {
        statusCode: exception.getStatus(),
        message: exception.message,
      };
      return throwError(() => error);
    }
    this.logger.error(exception);
    const error: RpcError = {
      statusCode: 500,
      message: 'Something went wrong on our side. Please try again',
    };
    return throwError(() => error);
  }
}
