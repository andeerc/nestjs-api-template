import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';

@Module({
  controllers: [ApplicationController],
  providers: [

  ],
})
export class ApplicationHttpModule { }
