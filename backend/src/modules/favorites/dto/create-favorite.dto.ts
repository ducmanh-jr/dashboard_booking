import { IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ example: '1', description: 'ID của property' })
  @IsNumberString()
  propertyId!: string;
}
