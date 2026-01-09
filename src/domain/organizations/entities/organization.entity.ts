export class Organization {
  declare id: number;
  name!: string;
  description!: string | null;
  slug!: string;
  avatarUrl!: string | null;
  ownerId!: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}