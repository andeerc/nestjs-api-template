export class RefreshTokens {
  declare id: number;
  userId!: number;
  token!: string;
  deviceInfo?: string;
  ipAddress?: string;
  expiresAt!: Date;
  revoked!: boolean;
  revokedAt?: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}
