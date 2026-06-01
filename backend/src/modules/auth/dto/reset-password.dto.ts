import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Password reset OTP' })
  @IsNotEmpty()
  @IsString()
  otp!: string;

  @ApiProperty({ example: 'NewPassword123', description: 'New account password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
