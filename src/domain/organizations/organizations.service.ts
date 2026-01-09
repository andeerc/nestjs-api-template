import { Injectable } from '@nestjs/common';
import { SessionStorageService } from '../public/session-storage/session-storage.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationRepository } from './organization.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly sessionStorageService: SessionStorageService
  ) { }

  slugExists(slug: string) {
    return this.organizationRepository.exists({ slug });
  }

  async createOrganization(dto: CreateOrganizationDto) {
    if (dto.slug && await this.slugExists(dto.slug)) {

      throw new Error("Organization with this slug already exists");
    }

    if (!dto.slug) {
      // Generate a unique slug if not provided
      let uniqueSlug: string;
      do {
        uniqueSlug = `org-${Math.random().toString(36).substring(2, 8)}`;
      } while (await this.slugExists(uniqueSlug));
      dto.slug = uniqueSlug;
    }

    const session = this.sessionStorageService.getStorageData();
    return this.organizationRepository.create({ ...dto, ownerId: session?.userId! });
  }
}
