import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class BookingCreateReviewDto {
  @ApiProperty({ example: 4.5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(5)
  overall_rating!: number;

  @ApiPropertyOptional({ example: 'Clean room and helpful service.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}
