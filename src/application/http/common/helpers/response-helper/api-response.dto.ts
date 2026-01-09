import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Página atual', example: 1 })
  page: number;

  @ApiProperty({ description: 'Itens por página', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total de itens', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total de páginas', example: 10 })
  totalPages: number;

  @ApiProperty({ description: 'Tem próxima página', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Tem página anterior', example: false })
  hasPrevPage: boolean;
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indica se a requisição foi bem-sucedida' })
  success: boolean;

  @ApiProperty({ description: 'Mensagem de resposta', required: false })
  message?: string;

  @ApiProperty({ description: 'Dados da resposta' })
  data?: T;

  @ApiProperty({
    description: 'Metadados de paginação',
    type: PaginationMetaDto,
    required: false,
  })
  meta?: PaginationMetaDto;

  @ApiProperty({ description: 'Timestamp da resposta' })
  timestamp: string;
}
