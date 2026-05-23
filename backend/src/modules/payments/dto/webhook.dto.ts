import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class WebhookDto {
  @ApiProperty({
    example: 'NWH-20260518-0001',
    description: 'Booking code returned by the payment provider.',
  })
  @IsString()
  bookingCode!: string;

  @ApiProperty({
    enum: ['SUCCESS', 'FAILED'],
    example: 'SUCCESS',
    description: 'Final transaction status reported by the payment provider.',
  })
  @IsEnum(['SUCCESS', 'FAILED'])
  transactionStatus!: 'SUCCESS' | 'FAILED';
}
