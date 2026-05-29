import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MAX_DAILY_RATE_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@ValidatorConstraint({ name: 'DailyRateDateRange', async: false })
class DailyRateDateRangeConstraint implements ValidatorConstraintInterface {
  validate(endDate: Date, args: ValidationArguments): boolean {
    const dto = args.object as GenerateDailyRatesDto;

    if (!(dto.startDate instanceof Date) || !(endDate instanceof Date)) {
      return false;
    }

    const start = this.toUtcDateOnly(dto.startDate);
    const end = this.toUtcDateOnly(endDate);
    const inclusiveDays =
      Math.floor((end.getTime() - start.getTime()) / MILLISECONDS_PER_DAY) + 1;

    return inclusiveDays > 0 && inclusiveDays <= MAX_DAILY_RATE_DAYS;
  }

  defaultMessage(): string {
    return `Date range must be between 1 and ${MAX_DAILY_RATE_DAYS} days`;
  }

  private toUtcDateOnly(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}

@ValidatorConstraint({ name: 'PositiveBigIntStringOrNumber', async: false })
class PositiveBigIntStringOrNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isSafeInteger(value) && value > 0;
    }

    if (typeof value === 'string') {
      return /^[1-9]\d*$/.test(value);
    }

    return false;
  }

  defaultMessage(): string {
    return 'ratePlanId must be a positive integer';
  }
}

export class GenerateDailyRatesDto {
  @ApiProperty({
    oneOf: [{ type: 'number' }, { type: 'string' }],
    example: '1',
  })
  @Validate(PositiveBigIntStringOrNumberConstraint)
  ratePlanId!: number | string;

  @ApiProperty({ example: '2026-06-01' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty({ example: '2026-06-30' })
  @Type(() => Date)
  @IsDate()
  @Validate(DailyRateDateRangeConstraint)
  endDate!: Date;
}
