import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Matches, Length } from 'class-validator';
import { gender_enum } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn B', description: 'Full name of the user' })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  fullName?: string;

  @ApiPropertyOptional({ example: '0123456789', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @Length(9, 20)
  phone?: string;

  @ApiPropertyOptional({ example: '01-01-1990', description: 'Date of birth (DD-MM-YYYY format)' })
  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/, { message: 'dateOfBirth must be in DD-MM-YYYY format' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: gender_enum, example: gender_enum.male, description: 'Gender' })
  @IsOptional()
  @IsEnum(gender_enum)
  gender?: gender_enum;
}
