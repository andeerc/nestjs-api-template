import { Module } from '@nestjs/common';
import { OrganizationRepository } from './organization.repository';
import { OrganizationsService } from './organizations.service';

@Module({
  providers: [OrganizationsService, OrganizationRepository],
  exports: [OrganizationsService],
})
export class OrganizationsModule { }
