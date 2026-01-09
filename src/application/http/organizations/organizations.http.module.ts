import { OrganizationsModule } from '@/domain/organizations/organizations.module';
import { Module } from '@nestjs/common';
import { OrganizationsHttpController } from './organizations.http.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [OrganizationsHttpController],
})
export class OrganizationsHttpModule { }
