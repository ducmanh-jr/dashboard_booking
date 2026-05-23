import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdatePropertyStatusDto {
  @ApiProperty({ enum: ['active', 'suspended', 'pending_review', 'rejected'] })
  @IsIn(['active', 'suspended', 'pending_review', 'rejected'])
  status!: 'active' | 'suspended' | 'pending_review' | 'rejected';
}
