import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CustomerCreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Overall rating (1–5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Optional review comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
