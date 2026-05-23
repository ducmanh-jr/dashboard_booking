import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  cancellation_type_enum,
  discount_type_enum,
  no_show_penalty_type_enum,
  parking_type_enum,
  Prisma,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

export class UpsertPropertyPoliciesDto {
  @ApiPropertyOptional({ enum: cancellation_type_enum })
  @IsOptional()
  @IsEnum(cancellation_type_enum)
  cancellation_type?: cancellation_type_enum;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  free_cancel_hours?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cancel_penalty_percent?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  min_stay_nights?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_stay_nights?: number;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  check_in_from?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  check_in_until?: string;

  @ApiPropertyOptional({ example: '00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  check_out_from?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  check_out_until?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  early_check_in_allowed?: boolean;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  early_check_in_fee?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  late_check_out_allowed?: boolean;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  late_check_out_fee?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  pets_allowed?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  smoking_allowed?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  children_allowed?: boolean;

  @ApiPropertyOptional({ enum: no_show_penalty_type_enum })
  @IsOptional()
  @IsEnum(no_show_penalty_type_enum)
  no_show_penalty_type?: no_show_penalty_type_enum;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  instant_confirmation?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  deposit_required?: boolean;

  @ApiPropertyOptional({ enum: discount_type_enum })
  @IsOptional()
  @IsEnum(discount_type_enum)
  deposit_type?: discount_type_enum;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deposit_value?: number;

  @ApiPropertyOptional({ type: [String], example: ['credit_card', 'pay_later'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accepted_payment_methods?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  breakfast_included?: boolean;

  @ApiPropertyOptional({ enum: parking_type_enum })
  @IsOptional()
  @IsEnum(parking_type_enum)
  parking_type?: parking_type_enum;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  parties_allowed?: boolean;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  quiet_hours_start?: string;

  @ApiPropertyOptional({ example: '06:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  quiet_hours_end?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  custom_rules?: string;

  toPrismaJsonPaymentMethods(): Prisma.InputJsonValue | undefined {
    return this.accepted_payment_methods;
  }
}
