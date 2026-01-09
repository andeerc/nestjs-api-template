import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token de verificação de email',
    example: 'abc123...',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
