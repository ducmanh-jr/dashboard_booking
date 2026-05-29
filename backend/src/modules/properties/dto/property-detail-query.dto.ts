import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class PropertyDetailQueryDto {
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'check_in must be a date-only string in YYYY-MM-DD format',
  })
  check_in?: string;

  @ApiPropertyOptional({ example: '2026-06-03' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_PATTERN, {
    message: 'check_out must be a date-only string in YYYY-MM-DD format',
  })
  check_out?: string;
}
