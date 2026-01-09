export class LoginAttempts {
  declare id: number;
  userId?: number;
  email!: string;
  ipAddress!: string;
  userAgent?: string;
  success!: boolean;
  failureReason?: string;
  declare attemptedAt: Date;
}
