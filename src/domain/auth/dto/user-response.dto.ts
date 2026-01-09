import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'ID do usuário', example: '123' })
  id: number;

  @ApiProperty({ description: 'Nome do usuário', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'Email do usuário', example: 'user@example.com' })
  email: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-12-20T12:00:00.000Z',
  })
  createdAt: string;
}
