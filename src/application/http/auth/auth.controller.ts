import { SessionStorageService } from '@/domain/public/session-storage/session-storage.service';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthService } from 'src/domain/auth/auth.service';
import {
  LoginDto,
  PasswordResetDto,
  PasswordResetRequestDto,
  RefreshTokenDto,
  RegisterDto,
  UserResponseDto,
  VerifyEmailDto,
} from 'src/domain/auth/dto';
import { ApiDoc, CurrentUser, Public } from '../common/decorators';
import { ResponseHelper } from '../common/helpers/response-helper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly _sessionStorageService: SessionStorageService,
  ) { }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc({
    summary: 'Registrar novo usuário',
    description: 'Cria uma nova conta de usuário no sistema',
    response: UserResponseDto,
  })
  async register(@Body() registerDto: RegisterDto, @Ip() ipAddress: string) {
    const user = await this.authService.register(registerDto, ipAddress);
    return ResponseHelper.success(user);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Fazer login',
    description:
      'Autentica o usuário e retorna refresh token. A sessão é criada automaticamente.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: FastifyRequest,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const { user, refreshToken } = await this.authService.login(
      loginDto,
      ipAddress,
      userAgent,
    );

    // Criar sessão
    request.session.userId = user.id;
    request.session.email = user.email;
    request.session.authenticated = true;
    this._sessionStorageService.updateStorageData(request.session);

    return ResponseHelper.success({ user, refreshToken });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Renovar token de acesso',
    description: 'Gera um novo refresh token usando o token atual',
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
  ) {
    const { user, refreshToken } = await this.authService.refreshAccessToken(
      refreshTokenDto.refreshToken,
      ipAddress,
    );

    return ResponseHelper.success({ user, refreshToken });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Fazer logout',
    description: 'Destrói a sessão e revoga o refresh token',
  })
  async logout(
    @Req() request: FastifyRequest,
    @Body() body?: { refreshToken?: string },
  ) {
    // Revogar refresh token se fornecido
    if (body?.refreshToken) {
      await this.authService.logout(body.refreshToken);
    }

    // Destruir sessão
    await new Promise<void>((resolve, reject) => {
      request.session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return ResponseHelper.success(null);
  }

  @Post('password/request-reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Solicitar reset de senha',
    description: 'Envia um email com token para reset de senha',
  })
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Ip() ipAddress: string,
  ) {
    await this.authService.requestPasswordReset(dto.email, ipAddress);
    return ResponseHelper.success(null);
  }

  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Resetar senha',
    description: 'Reseta a senha usando o token recebido por email',
  })
  async resetPassword(@Body() dto: PasswordResetDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return ResponseHelper.success(null);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Verificar email',
    description: 'Verifica o email usando o token recebido por email',
    response: UserResponseDto,
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const user = await this.authService.verifyEmail(dto.token);
    return ResponseHelper.success(user);
  }

  @Get('me')
  @ApiDoc({
    summary: 'Obter usuário autenticado',
    description: 'Retorna os dados do usuário atualmente autenticado',
    response: UserResponseDto,
  })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.authService.validateSession(Number(userId));
    return ResponseHelper.success(user);
  }

  @Get('session')
  @ApiDoc({
    summary: 'Verificar sessão',
    description: 'Verifica se há uma sessão ativa',
  })
  getSession(@CurrentUser() user: any) {
    return ResponseHelper.success(
      {
        authenticated: !!user,
        user: user || null,
      },
    );
  }
}
