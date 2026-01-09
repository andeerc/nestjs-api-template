import { Controller, Get, Ip } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('application')
@Controller('')
export class ApplicationController {
  @Get()
  hello(@Ip() ip: string) {
    return `Hello ${ip}`
  }
}
