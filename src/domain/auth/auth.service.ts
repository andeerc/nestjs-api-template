import { EmailService } from '@/integrations/email/email.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RefreshTokens } from './entities/refresh-tokens';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userService: UsersService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Registra um novo usuário
   */
  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    return await this.authRepository.runInTransaction(async () => {
      // Verificar se usuário já existe
      const existingUser = await this.userService.findByEmail(
        registerDto.email,
      );

      if (existingUser) {
        throw new ConflictException('Email já cadastrado');
      }

      // create novo usuário inativo (será ativado após verificação de email)
      const user = await this.userService.create({
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        active: false,
      });

      // Log de tentativa bem sucedida
      await this.authRepository.registerLoginAttempts({
        userId: user.id,
        email: user.email,
        ipAddress: ipAddress || 'unknown',
        userAgent: 'registration',
        success: true,
      });

      // Gerar token de verificação
      const verificationToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      await this.authRepository.createEmailVerification({
        userId: user.id,
        token: verificationToken,
        expiresAt: expiresAt,
        ipAddress: ipAddress,
        used: false,
      });

      // Enviar email de verificação
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
      );

      return this.toUserResponse(user);
    });
  }

  /**
   * Realiza login do usuário
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: UserResponseDto; refreshToken: string }> {
    return await this.authRepository.runInTransaction(async () => {
      // Verificar rate limiting
      const recentFailures =
        await this.authRepository.countRecentFailedAttempts(
          loginDto.email,
        );
      if (recentFailures >= 5) {
        throw new UnauthorizedException(
          'Muitas tentativas de login. Tente novamente em 15 minutos.',
        );
      }

      const user = await this.userService.findByEmail(loginDto.email);

      if (!user) {
        await this.authRepository.registerLoginAttempts({
          email: loginDto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent,
          success: false,
          failureReason: 'user_not_found',
        });
        throw new UnauthorizedException('Credenciais inválidas');
      }

      if (!user.active) {
        await this.authRepository.registerLoginAttempts({
          userId: user.id,
          email: loginDto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent,
          success: false,
          failureReason: 'user_inactive',
        });
        throw new UnauthorizedException('Usuário inativo');
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        await this.authRepository.registerLoginAttempts({
          userId: user.id,
          email: loginDto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent,
          success: false,
          failureReason: 'invalid_password',
        });
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // Log de login bem sucedido
      await this.authRepository.registerLoginAttempts({
        userId: user.id,
        email: loginDto.email,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent,
        success: true,
      });

      // Gerar refresh token
      const refreshToken = await this.generateRefreshToken(
        user.id,
        ipAddress,
        userAgent,
      );

      return {
        user: this.toUserResponse(user),
        refreshToken: refreshToken.token,
      };
    });
  }

  /**
   * Valida e renova refresh token
   */
  async refreshAccessToken(
    token: string,
    ipAddress?: string,
  ): Promise<{ user: UserResponseDto; refreshToken: string }> {
    return await this.authRepository.runInTransaction(async () => {
      const refreshToken = await this.authRepository.findRefreshTokens(token);

      if (!refreshToken) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      // Verificar se token está válido (não revogado e não expirado)
      if (refreshToken.revoked || new Date(refreshToken.expiresAt) < new Date()) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      // Buscar usuário
      const user = await this.userService.findById(refreshToken.userId);

      if (!user.active) {
        throw new UnauthorizedException('Usuário inativo');
      }

      // Revogar token antigo
      await this.authRepository.revokeToken(refreshToken.id);

      // Gerar novo refresh token
      const newRefreshToken = await this.generateRefreshToken(
        refreshToken.userId,
        ipAddress,
        refreshToken.deviceInfo,
      );

      return {
        user: this.toUserResponse(user),
        refreshToken: newRefreshToken.token,
      };
    });
  }

  /**
   * Faz logout do usuário (revoga refresh token)
   */
  async logout(token: string): Promise<void> {
    await this.authRepository.runInTransaction(async () => {
      const refreshToken = await this.authRepository.findRefreshTokens(token);

      if (refreshToken) {
        await this.authRepository.revokeToken(refreshToken.id);
      }
    });
  }

  /**
   * Solicita reset de senha
   */
  async requestPasswordReset(email: string, ipAddress?: string): Promise<void> {
    await this.authRepository.runInTransaction(async () => {
      const user = await this.userService.findByEmail(email);

      if (!user) {
        // Por segurança, não revela se o email existe
        return;
      }

      // Gerar token de reset
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await this.authRepository.createPasswordReset({
        userId: user.id,
        token,
        expiresAt: expiresAt,
        ipAddress: ipAddress,
        used: false,
      });

      // Enviar email com o token de reset
      await this.emailService.sendPasswordReset(user.email, token);
    });
  }

  /**
   * Reseta a senha usando token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.authRepository.runInTransaction(async () => {
      const passwordReset =
        await this.authRepository.findValidPasswordReset(token);

      if (!passwordReset) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      // Atualizar senha do usuário (o hash é feito no UsuariosService)
      await this.userService.update(passwordReset.userId, {
        password: newPassword,
      });

      // Marcar token como usado
      await this.authRepository.markPasswordResetAsUsed(passwordReset.id);

      // Revogar todos os refresh tokens do usuário
      await this.authRepository.revokeUserTokens(
        passwordReset.userId,
      );
    });
  }

  /**
   * Verifica o email do usuário usando token
   */
  async verifyEmail(token: string): Promise<UserResponseDto> {
    return await this.authRepository.runInTransaction(async () => {
      const emailVerification =
        await this.authRepository.findValidEmailVerification(token);

      if (!emailVerification) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      // Buscar usuário
      const user = await this.userService.findById(
        emailVerification.userId,
      );

      // Ativar usuário
      await this.userService.update(emailVerification.userId, {
        active: true,
      });

      // Marcar verificação como usada
      await this.authRepository.markPasswordResetAsUsed(
        emailVerification.id,
      );

      // Enviar email de boas-vindas
      await this.emailService.sendWelcomeEmail(user.email, user.name);

      return this.toUserResponse({ ...user, active: true });
    });
  }

  /**
   * Valida sessão do usuário
   */
  async validateSession(userId: number): Promise<UserResponseDto | null> {
    try {
      const user = await this.userService.findById(userId);

      if (!user || !user.active) {
        return null;
      }

      return this.toUserResponse(user);
    } catch {
      return null;
    }
  }

  /**
   * Busca usuário por ID
   */
  async findById(id: number): Promise<User | null> {
    try {
      return await this.userService.findById(id);
    } catch {
      return null;
    }
  }

  /**
   * Gera um novo refresh token
   */
  private async generateRefreshToken(
    userId: number,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<RefreshTokens> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    return this.authRepository.createRefreshTokens({
      userId: userId,
      token,
      deviceInfo: deviceInfo,
      ipAddress: ipAddress,
      expiresAt: expiresAt,
      revoked: false,
    });
  }

  /**
   * Converte Usuario para UserResponseDto
   */
  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name || '',
      email: user.email,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Limpa tokens e sessões expiradas
   */
  async cleanExpiredData(): Promise<void> {
    await this.authRepository.runInTransaction(async () => {
      // Limpar refresh tokens expirados
      await this.authRepository.clearExpiredTokens();

      // Limpar password resets expirados
      await this.authRepository.clearExpiredPasswordResets();

      // Limpar verificações de email expiradas
      await this.authRepository.clearExpiredVerifications();

      // Limpar sessões expiradas
      await this.authRepository.clearExpiredSessions();

      // Limpar login attempts antigos (> 30 dias)
      await this.authRepository.clearOldLoginAttempts(30);
    });
  }
}
