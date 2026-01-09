export class OrganizationMember {
  declare id: number;
  organizationId!: number;
  userId!: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}