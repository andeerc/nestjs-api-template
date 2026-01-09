import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { envConfig } from 'src/config/env.config';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: envConfig.redis.host,
        port: envConfig.redis.port,
        password: envConfig.redis.password,
      },
      prefix: 'proc-',
      defaultJobOptions: {
        attempts: 1,
      },
    })
  ]
})
export class QueueModule { }
