import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ReviewKycAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewKycDto {
  @ApiProperty({ enum: ReviewKycAction, example: ReviewKycAction.APPROVE })
  @IsEnum(ReviewKycAction)
  action!: ReviewKycAction;
}
