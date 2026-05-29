import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ReviewPropertyAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewPropertyDto {
  @ApiProperty({
    enum: ReviewPropertyAction,
    example: ReviewPropertyAction.APPROVE,
  })
  @IsEnum(ReviewPropertyAction)
  action!: ReviewPropertyAction;
}
