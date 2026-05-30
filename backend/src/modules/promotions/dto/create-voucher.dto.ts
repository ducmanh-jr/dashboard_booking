import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateVoucherDto {
  @ApiProperty({ example: 'SUMMER2026', description: 'Mã voucher (duy nhất, viết hoa, không dấu)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Mã voucher chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới' })
  code!: string;

  @ApiPropertyOptional({ example: 1, description: 'Số lần tối đa mỗi user dùng được (mặc định 1)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUsesPerUser?: number;
}
