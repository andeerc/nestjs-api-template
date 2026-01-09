import { Module } from '@nestjs/common';
import { CacheServiceModule } from './cache';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    DatabaseModule,
    CacheServiceModule,
    QueueModule,
  ],
})
export class InfrastructureModule { }
