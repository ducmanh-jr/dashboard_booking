import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { discount_type_enum, promo_type_enum } from '@prisma/client';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Flash Sale Hè 2026' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: promo_type_enum })
  @IsEnum(promo_type_enum)
  promoType!: promo_type_enum;

  @ApiProperty({ enum: discount_type_enum })
  @IsEnum(discount_type_enum)
  discountType!: discount_type_enum;

  @ApiProperty({ example: 20, description: 'Giá trị giảm (% hoặc VNĐ cố định)' })
  @IsNumber()
  @IsPositive()
  discountValue!: number;

  @ApiPropertyOptional({ example: 500000, description: 'Giảm tối đa (chỉ áp dụng khi discountType = percent)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 500000, description: 'Giá trị đơn tối thiểu để áp dụng' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiProperty({ example: '2026-06-01', description: 'Ngày bắt đầu YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate phải có định dạng YYYY-MM-DD' })
  startDate!: string;

  @ApiProperty({ example: '2026-08-31', description: 'Ngày kết thúc YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate phải có định dạng YYYY-MM-DD' })
  endDate!: string;

  @ApiPropertyOptional({ example: 100, description: 'Tổng lượt dùng tối đa (null = không giới hạn)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUses?: number;

  @ApiPropertyOptional({ example: 5, description: 'ID đối tác (null = áp dụng toàn platform)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  partnerId?: number;
}
