import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PresignedMediaUrlQueryDto {
  @ApiPropertyOptional({ example: 'properties/123' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  folder?: string;
}
