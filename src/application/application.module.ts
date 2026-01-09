import { Module } from '@nestjs/common';
import { CronjobsModule } from './cronjobs/cronjobs.module';
import { HttpModule } from './http/http.module';
import { WsModule } from './ws/ws.module';

@Module({
  imports: [CronjobsModule, HttpModule, WsModule],
  controllers: [],
})
export class ApplicationModule { }
