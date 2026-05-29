import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'DecimalNumberOrString', async: false })
class DecimalNumberOrStringConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0;
    }

    if (typeof value === 'string') {
      return /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value);
    }

    return false;
  }

  defaultMessage(): string {
    return 'basePrice must be a positive number or decimal string';
  }
}

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'Deluxe Double Room' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'A comfortable room with city view.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 28.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  areaSqm!: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxOccupancy!: number;

  @ApiProperty({
    oneOf: [{ type: 'number' }, { type: 'string' }],
    example: '1200000.00',
  })
  @Validate(DecimalNumberOrStringConstraint)
  basePrice!: number | string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalRooms!: number;
}
