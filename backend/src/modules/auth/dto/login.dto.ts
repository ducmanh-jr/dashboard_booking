import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { device_type_enum } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: 'Chrome on Windows' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;

  @ApiPropertyOptional({
    enum: device_type_enum,
    example: device_type_enum.web,
  })
  @IsOptional()
  @IsEnum(device_type_enum)
  deviceType?: device_type_enum;
}
