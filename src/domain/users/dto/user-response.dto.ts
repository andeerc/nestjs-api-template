import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'ID do usuário', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário', example: 'João Silva' })
  nome: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao.silva@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'CPF do usuário',
    example: '123.456.789-00',
    required: false,
  })
  cpf?: string;

  @ApiProperty({
    description: 'Telefone do usuário',
    example: '(11) 98765-4321',
    required: false,
  })
  telefone?: string;

  @ApiProperty({ description: 'Status do usuário', example: true })
  ativo: boolean;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-12-23T12:00:00.000Z',
  })
  criadoEm: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2025-12-23T12:00:00.000Z',
  })
  atualizadoEm: Date;
}
