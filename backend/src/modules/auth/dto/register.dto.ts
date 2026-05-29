import { ApiProperty } from '@nestjs/swagger';
import { business_type_enum, user_type_enum } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;

  @ApiProperty({ example: '+84901234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({
    enum: user_type_enum,
    example: user_type_enum.customer,
  })
  @IsEnum(user_type_enum)
  userType!: user_type_enum;

  @ApiProperty({ example: 'Nguyen Van A Travel Co.', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  businessName?: string;

  @ApiProperty({
    enum: business_type_enum,
    example: business_type_enum.individual,
    required: false,
  })
  @IsOptional()
  @IsEnum(business_type_enum)
  businessType?: business_type_enum;
}
