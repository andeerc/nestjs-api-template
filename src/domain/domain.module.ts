import { Module } from '@nestjs/common';
import { AdministrationModule } from './administration/administration.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PublicModule } from './public/public.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AdministrationModule,
    PublicModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
  ],
  exports: [
    AdministrationModule,
    PublicModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
  ],
})
export class DomainModule { }
