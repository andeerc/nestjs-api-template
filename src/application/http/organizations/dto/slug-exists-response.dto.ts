import { ApiProperty } from "@nestjs/swagger";

export class SlugExistsDto {
  @ApiProperty({
    description: 'Indicates whether the organization slug exists',
    example: true,
  })
  exists: boolean;
}