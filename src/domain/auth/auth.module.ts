import { EmailModule } from '@/integrations/email/email.module';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

@Module({
  imports: [
    EmailModule,
    UsersModule,
  ],
  providers: [
    AuthRepository,
    AuthService,
  ],
  exports: [AuthService],
})
export class AuthModule { }
