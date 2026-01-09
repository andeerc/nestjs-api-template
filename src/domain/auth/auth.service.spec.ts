import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { KNEX_CONNECTION } from '../../database/database.module';
import {
  User,
  RefreshToken,
  PasswordReset,
  LoginAttempt,
} from '../../database/models';
import * as bcrypt from 'bcrypt';

// Mock dos models
jest.mock('../../database/models', () => ({
  User: {
    query: jest.fn(),
  },
  RefreshToken: {
    query: jest.fn(),
  },
  PasswordReset: {
    query: jest.fn(),
  },
  LoginAttempt: {
    logAttempt: jest.fn(),
    getRecentFailedAttempts: jest.fn(),
    query: jest.fn(),
  },
  UserSession: {
    cleanExpired: jest.fn(),
    query: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockKnex: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    mockKnex = {
      destroy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: KNEX_CONNECTION,
          useValue: mockKnex,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
        isActive: true,
        createdAt: new Date(),
      };

      // Mock User.query().findOne() - não existe usuário
      (User.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      // Mock User.query().insert() - cria usuário
      (User.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock LoginAttempt.logAttempt
      (LoginAttempt.logAttempt as jest.Mock).mockResolvedValue({});

      const result = await service.register(registerDto, '127.0.0.1');

      expect(result).toEqual({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(String),
      });
      expect(LoginAttempt.logAttempt).toHaveBeenCalledWith({
        userId: 1,
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        success: true,
      });
    });

    it('deve lançar ConflictException se email já existe', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock User.query().findOne() - usuário já existe
      (User.query as jest.Mock).mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 1, email: 'test@example.com' }),
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Test User',
        isActive: true,
        createdAt: new Date(),
      };

      // Mock getRecentFailedAttempts
      (LoginAttempt.getRecentFailedAttempts as jest.Mock).mockResolvedValue(0);

      // Mock User.query().findOne()
      (User.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock RefreshToken.query().insert()
      (RefreshToken.query as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          token: 'refresh-token-123',
        }),
      });

      // Mock LoginAttempt.logAttempt
      (LoginAttempt.logAttempt as jest.Mock).mockResolvedValue({});

      const result = await service.login(loginDto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
      expect(LoginAttempt.logAttempt).toHaveBeenCalledWith({
        userId: 1,
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        success: true,
      });
    });

    it('deve bloquear login após 5 tentativas falhas', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock getRecentFailedAttempts - 5 falhas
      (LoginAttempt.getRecentFailedAttempts as jest.Mock).mockResolvedValue(5);

      await expect(
        service.login(loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow('Muitas tentativas de login');
    });

    it('deve lançar UnauthorizedException para credenciais inválidas', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Test User',
        isActive: true,
      };

      // Mock getRecentFailedAttempts
      (LoginAttempt.getRecentFailedAttempts as jest.Mock).mockResolvedValue(0);

      // Mock User.query().findOne()
      (User.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock LoginAttempt.logAttempt
      (LoginAttempt.logAttempt as jest.Mock).mockResolvedValue({});

      await expect(
        service.login(loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(LoginAttempt.logAttempt).toHaveBeenCalledWith({
        userId: 1,
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        success: false,
        failureReason: 'invalid_password',
      });
    });

    it('deve bloquear usuário inativo', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Test User',
        isActive: false, // Inativo
      };

      // Mock getRecentFailedAttempts
      (LoginAttempt.getRecentFailedAttempts as jest.Mock).mockResolvedValue(0);

      // Mock User.query().findOne()
      (User.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock LoginAttempt.logAttempt
      (LoginAttempt.logAttempt as jest.Mock).mockResolvedValue({});

      await expect(
        service.login(loginDto, '127.0.0.1', 'test-agent'),
      ).rejects.toThrow('Usuário inativo');
    });
  });

  describe('refreshAccessToken', () => {
    it('deve renovar refresh token válido', async () => {
      const mockRefreshToken = {
        id: 1,
        userId: 1,
        token: 'old-token',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: 'test-device',
        isValid: jest.fn().mockReturnValue(true),
        revoke: jest.fn().mockResolvedValue({}),
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isActive: true,
          createdAt: new Date(),
        },
      };

      // Mock RefreshToken.query()
      (RefreshToken.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockReturnValue({
          withGraphFetched: jest.fn().mockResolvedValue(mockRefreshToken),
        }),
        insert: jest.fn().mockResolvedValue({
          token: 'new-token-123',
        }),
      });

      const result = await service.refreshAccessToken('old-token', '127.0.0.1');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('refreshToken', 'new-token-123');
      expect(mockRefreshToken.revoke).toHaveBeenCalled();
    });

    it('deve rejeitar token inválido', async () => {
      const mockRefreshToken = {
        isValid: jest.fn().mockReturnValue(false),
      };

      // Mock RefreshToken.query()
      (RefreshToken.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockReturnValue({
          withGraphFetched: jest.fn().mockResolvedValue(mockRefreshToken),
        }),
      });

      await expect(
        service.refreshAccessToken('invalid-token', '127.0.0.1'),
      ).rejects.toThrow('Token inválido ou expirado');
    });
  });

  describe('resetPassword', () => {
    it('deve resetar senha com token válido', async () => {
      const mockPasswordReset = {
        id: 1,
        userId: 1,
        token: 'reset-token',
        isUsed: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isValid: jest.fn().mockReturnValue(true),
        markAsUsed: jest.fn().mockResolvedValue({}),
        user: {
          id: 1,
          email: 'test@example.com',
        },
      };

      // Mock PasswordReset.query()
      (PasswordReset.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockReturnValue({
          withGraphFetched: jest.fn().mockResolvedValue(mockPasswordReset),
        }),
      });

      // Mock User.query()
      (User.query as jest.Mock).mockReturnValue({
        findById: jest.fn().mockReturnValue({
          patch: jest.fn().mockResolvedValue({}),
        }),
      });

      // Mock RefreshToken.query()
      (RefreshToken.query as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnValue({
          patch: jest.fn().mockResolvedValue({}),
        }),
      });

      await service.resetPassword('reset-token', 'newPassword123');

      expect(mockPasswordReset.markAsUsed).toHaveBeenCalled();
    });

    it('deve rejeitar token expirado', async () => {
      const mockPasswordReset = {
        isValid: jest.fn().mockReturnValue(false),
      };

      // Mock PasswordReset.query()
      (PasswordReset.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockReturnValue({
          withGraphFetched: jest.fn().mockResolvedValue(mockPasswordReset),
        }),
      });

      await expect(
        service.resetPassword('expired-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateSession', () => {
    it('deve validar sessão de usuário ativo', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        createdAt: new Date(),
      };

      // Mock User.query()
      (User.query as jest.Mock).mockReturnValue({
        findById: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.validateSession(1);

      expect(result).toEqual({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: expect.any(String),
      });
    });

    it('deve retornar null para usuário inativo', async () => {
      const mockUser = {
        id: 1,
        isActive: false,
      };

      // Mock User.query()
      (User.query as jest.Mock).mockReturnValue({
        findById: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.validateSession(1);

      expect(result).toBeNull();
    });
  });
});
