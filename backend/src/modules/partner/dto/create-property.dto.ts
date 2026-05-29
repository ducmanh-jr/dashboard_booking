import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { property_type_enum } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({ example: 'NoWayHome Central Hotel' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name!: string;

  @ApiProperty({ enum: property_type_enum, example: property_type_enum.hotel })
  @IsEnum(property_type_enum)
  propertyType!: property_type_enum;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: '12 Nguyen Hue, District 1' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 10.7758439 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 106.7017555 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ example: 'Modern hotel in the city center.' })
  @IsOptional()
  @IsString()
  description?: string;
}
