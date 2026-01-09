import { BaseRepository } from 'src/infrastructure/database/base-respository';
import { EmailVerification } from './entities/email-verification.entity';
import { LoginAttempts } from './entities/login-attempts.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { RefreshTokens } from './entities/refresh-tokens';
import { UserSession } from './entities/user-sessions';

export class AuthRepository extends BaseRepository {
  // MARK: - TOKENS DE RENOVAÇÃO

  async createRefreshTokens(
    dados: Partial<RefreshTokens>,
  ): Promise<RefreshTokens> {
    const [token] = await this.db.from<RefreshTokens>('refresh_tokens')
      .insert(dados)
      .returning('*');
    return token;
  }

  async findRefreshTokens(token: string): Promise<RefreshTokens | null> {
    const result = await this.db.from<RefreshTokens>('refresh_tokens')
      .where({ token })
      .first();
    return result || null;
  }

  async findActiveUserTokens(
    userId: number,
  ): Promise<RefreshTokens[]> {
    return this.db.from<RefreshTokens>('refresh_tokens')
      .where({ userId: userId, revoked: false })
      .where('expiresAt', '>', this.fn.now())
      .select('*');
  }

  async revokeToken(tokenId: number): Promise<RefreshTokens | null> {
    const [result] = await this.db.from<RefreshTokens>('refresh_tokens')
      .where({ id: tokenId })
      .update({
        revoked: true,
        revokedAt: this.fn.now(),
        updatedAt: this.fn.now(),
      })
      .returning('*');
    return result || null;
  }

  async revokeUserTokens(userId: number): Promise<number> {
    return this.db.from<RefreshTokens>('refresh_tokens')
      .where({ userId: userId, revoked: false })
      .update({
        revoked: true,
        revokedAt: this.fn.now(),
        updatedAt: this.fn.now(),
      });
  }

  async clearExpiredTokens(): Promise<number> {
    return this.db.from<RefreshTokens>('refresh_tokens')
      .where('expiresAt', '<', this.fn.now())
      .del();
  }

  //#endregion
  //#region RECUPERAÇÃO DE SENHA

  async createPasswordReset(
    data: Partial<PasswordReset>,
  ): Promise<PasswordReset> {
    const [result] = await this.db.from<PasswordReset>('password_resets')
      .insert(data)
      .returning('*');
    return result;
  }

  async findPasswordReset(
    token: string,
  ): Promise<PasswordReset | null> {
    const result = await this.db.from<PasswordReset>('password_resets')
      .where({ token })
      .first();
    return result || null;
  }

  async findValidPasswordReset(
    token: string,
  ): Promise<PasswordReset | null> {
    const result = await this.db.from<PasswordReset>('password_resets')
      .where({ token, used: false })
      .where('expiresAt', '>', this.fn.now())
      .first();
    return result || null;
  }

  async markPasswordResetAsUsed(
    passwordResetId: number,
  ): Promise<PasswordReset | null> {
    const [result] = await this.db.from<PasswordReset>('password_resets')
      .where({ id: passwordResetId })
      .update({
        used: true,
        usedAt: this.fn.now(),
        updatedAt: this.fn.now(),
      })
      .returning('*');
    return result || null;
  }

  async invalidatePendingPasswordResets(
    userId: number,
  ): Promise<number> {
    return this.db.from<PasswordReset>('password_resets')
      .where({ userId: userId, used: false })
      .update({
        usedAt: this.fn.now(),
        updatedAt: this.fn.now(),
      });
  }

  async clearExpiredPasswordResets(): Promise<number> {
    return this.db.from<PasswordReset>('password_resets')
      .where('expiresAt', '<', this.fn.now())
      .del();
  }

  //#endregion
  //#region TENTATIVAS DE LOGIN

  async registerLoginAttempts(
    dados: Partial<LoginAttempts>,
  ): Promise<LoginAttempts> {
    const [tentativa] = await this.db.from<LoginAttempts>('login_attempts')
      .insert(dados)
      .returning('*');
    return tentativa;
  }

  async findRecentAttemptsByEmail(
    email: string,
    minutesAgo: number = 15,
  ): Promise<LoginAttempts[]> {
    const dataLimite = new Date();
    dataLimite.setMinutes(dataLimite.getMinutes() - minutesAgo);

    return this.db.from<LoginAttempts>('login_attempts')
      .where({ email })
      .where('attemptedAt', '>', dataLimite.toISOString())
      .orderBy('attemptedAt', 'desc')
      .select('*');
  }

  async findRecentAttemptsByIp(
    ipAddress: string,
    minutesAgo: number = 15,
  ): Promise<LoginAttempts[]> {
    const dataLimite = new Date();
    dataLimite.setMinutes(dataLimite.getMinutes() - minutesAgo);

    return this.db.from<LoginAttempts>('login_attempts')
      .where({ ipAddress: ipAddress })
      .where('attemptedAt', '>', dataLimite.toISOString())
      .orderBy('attemptedAt', 'desc')
      .select('*');
  }

  async countRecentFailedAttempts(
    email: string,
    minutesAgo: number = 15,
  ): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setMinutes(dataLimite.getMinutes() - minutesAgo);

    const result = await this.db.from<LoginAttempts>('login_attempts')
      .where({ email, success: false })
      .where('attemptedAt', '>', dataLimite.toISOString())
      .count('* as total')
      .first<{ total: number }>();

    return result ? Number(result.total) : 0;
  }

  async clearOldLoginAttempts(daysAgo: number = 30): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - daysAgo);

    return this.db.from<LoginAttempts>('login_attempts')
      .where('attemptedAt', '<', dataLimite.toISOString())
      .del();
  }

  //#endregion
  //#region SESSÕES DE USUÁRIO

  async createSessaoUsuario(
    dados: Partial<UserSession>,
  ): Promise<UserSession> {
    const [sessao] = await this.db.from<UserSession>('user_sessions')
      .insert(dados)
      .returning('*');
    return sessao;
  }

  async findSessionById(sessionId: string): Promise<UserSession | null> {
    const result = await this.db.from<UserSession>('user_sessions')
      .where({ sessionId: sessionId })
      .first();
    return result || null;
  }

  async findValidSession(sessionId: string): Promise<UserSession | null> {
    const result = await this.db.from<UserSession>('user_sessions')
      .where({ sessionId: sessionId })
      .where('expiresAt', '>', this.fn.now())
      .first();
    return result || null;
  }

  async findActiveSessionsByUser(
    userId: number,
  ): Promise<UserSession[]> {
    return this.db.from<UserSession>('user_sessions')
      .where({ userId: userId })
      .where('expiresAt', '>', this.fn.now())
      .orderBy('lastActivity', 'desc')
      .select('*');
  }

  async updateLastActivity(
    sessionId: string,
  ): Promise<UserSession | null> {
    const [result] = await this.db.from<UserSession>('user_sessions')
      .where({ sessionId: sessionId })
      .update({
        lastActivity: this.fn.now(),
        updatedAt: this.fn.now(),
      })
      .returning('*');
    return result || null;
  }

  async removeSession(sessionId: string): Promise<boolean> {
    const result = await this.db.from<UserSession>('user_sessions')
      .where({ sessionId: sessionId })
      .del();
    return result > 0;
  }

  async removeAllUserSessions(userId: number): Promise<number> {
    return this.db.from<UserSession>('user_sessions')
      .where({ userId: userId })
      .del();
  }

  async clearExpiredSessions(): Promise<number> {
    return this.db.from<UserSession>('user_sessions')
      .where('expiresAt', '<', this.fn.now())
      .del();
  }

  async clearInactiveSessions(hoursInactive: number = 24): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - hoursInactive);

    return this.db.from<UserSession>('user_sessions')
      .where('lastActivity', '<', dataLimite.toISOString())
      .del();
  }
  //#endregion

  //#region VERIFICAÇÃO DE EMAIL

  async createEmailVerification(
    dados: Partial<EmailVerification>,
  ): Promise<EmailVerification> {
    const [verificacao] = await this.db.from<EmailVerification>('email_verifications')
      .insert(dados)
      .returning('*');
    return verificacao;
  }

  async findEmailVerification(
    token: string,
  ): Promise<EmailVerification | null> {
    const result = await this.db.from<EmailVerification>('email_verifications')
      .where({ token })
      .first();
    return result || null;
  }

  async findValidEmailVerification(
    token: string,
  ): Promise<EmailVerification | null> {
    const result = await this.db.from<EmailVerification>('email_verifications')
      .where({ token, used: false })
      .where('expiresAt', '>', this.fn.now())
      .first();
    return result || null;
  }

  async setVerificationAsUsed(
    verificationId: number,
  ): Promise<EmailVerification | null> {
    const [result] = await this.db.from<EmailVerification>('email_verifications')
      .where({ id: verificationId })
      .update({
        used: true,
        usedAt: this.fn.now(),
        updatedAt: this.fn.now(),
      })
      .returning('*');
    return result || null;
  }

  async invalidatePendingVerificationsForUser(
    userId: number,
  ): Promise<number> {
    return this.db.from<EmailVerification>('email_verifications')
      .where({ userId: userId, used: false })
      .update({
        used: true,
        usedAt: this.fn.now(),
        updatedAt: this.fn.now(),
      });
  }

  async clearExpiredVerifications(): Promise<number> {
    return this.db.from<EmailVerification>('email_verifications')
      .where('expiresAt', '<', this.fn.now())
      .del();
  }

  //#endregion
}
