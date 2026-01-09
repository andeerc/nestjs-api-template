import { OrganizationsService } from '@/domain/organizations/organizations.service';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiDoc } from '../common/decorators';
import { ResponseHelper } from '../common/helpers/response-helper';
import { SlugExistsDto } from './dto/slug-exists-response.dto';

@Controller('organizations')
@ApiTags('organizations')
export class OrganizationsHttpController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) { }

  @Get('slug-exists/:slug')
  @ApiDoc({
    description: 'Check if an organization slug exists',
    summary: 'Check Organization Slug Existence',
    query: [{
      name: 'slug',
      required: true,
      description: 'The slug to check for existence',
      example: 'my-organization',
    }],
    response: SlugExistsDto,
  })
  async checkSlugExists(@Query('slug') slug: string) {
    const exists = await this.organizationsService.slugExists(slug);

    return ResponseHelper.success({ exists });
  }
}
