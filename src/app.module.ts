import { Module } from '@nestjs/common';
import { ApplicationModule } from './application/application.module';
import { DomainModule } from './domain/domain.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    IntegrationsModule,
    InfrastructureModule,
    DomainModule,
    ApplicationModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppModule { }
