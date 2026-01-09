import { BaseRepository } from "@/infrastructure/database/base-respository";
import { Injectable } from "@nestjs/common";
import { Organization } from "./entities/organization.entity";

@Injectable()
export class OrganizationRepository extends BaseRepository {
  async exists(where: Partial<Organization>): Promise<boolean> {
    const result = await this.db.from<Organization>('organizations')
      .select('id')
      .where(where)
      .limit(1);
    return result.length > 0;
  }

  async create(data: Partial<Organization>): Promise<Organization> {
    const [organization] = await this.db.from<Organization>('organizations')
      .insert(data)
      .returning('*');
    return organization;
  }

}
