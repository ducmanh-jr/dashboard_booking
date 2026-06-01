import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

import { Type } from 'class-transformer';

export class CreateReviewBodyDto {
  @ApiProperty({ example: '1', description: 'ID of the booking to review' })
  @IsNotEmpty()
  @IsString()
  bookingId!: string;

  @ApiProperty({ example: 4.5, description: 'Overall rating from 1 to 5' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Great stay!', description: 'Optional review comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
