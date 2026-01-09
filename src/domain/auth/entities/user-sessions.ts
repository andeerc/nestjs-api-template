export class UserSession {
  declare id: number;
  userId!: number;
  sessionId!: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity!: Date;
  expiresAt!: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}
