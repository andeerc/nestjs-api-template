export class PasswordReset {
  declare id: number;
  userId!: number;
  token!: string;
  expiresAt!: Date;
  used!: boolean;
  usedAt?: Date;
  ipAddress?: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}
