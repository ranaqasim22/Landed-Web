import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { createLoggerModule } from '@app/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    createLoggerModule(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('IDENTITY_MONGODB_URI'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: Number(config.getOrThrow<string>('REDIS_PORT')),
        },
      }),
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class IdentityModule {}
