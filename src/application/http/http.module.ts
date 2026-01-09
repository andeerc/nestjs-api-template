import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AdministrationHttpModule } from './administration/administration.http.module';
import { ApplicationHttpModule } from './application/application.http.module';
import { AuthHttpModule } from './auth/auth.http.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { SessionStorageInterceptor } from './common/interceptors';
import { OrganizationsHttpModule } from './organizations/organizations.http.module';

@Module({
  imports: [AuthHttpModule, AdministrationHttpModule, ApplicationHttpModule, OrganizationsHttpModule],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    { provide: APP_GUARD, useClass: AuthGuard },

    { provide: APP_INTERCEPTOR, useClass: SessionStorageInterceptor },
  ],
})
export class HttpModule { }
