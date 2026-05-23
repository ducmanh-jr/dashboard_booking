import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'checkInBeforeCheckOut', async: false })
class CheckInBeforeCheckOut implements ValidatorConstraintInterface {
  validate(checkInDate: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreateBookingDto;
    if (!(checkInDate instanceof Date) || !(dto.checkOutDate instanceof Date)) {
      return false;
    }
    return checkInDate.getTime() < dto.checkOutDate.getTime();
  }

  defaultMessage(): string {
    return 'checkInDate must be strictly before checkOutDate';
  }
}

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'Property ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId!: number;

  @ApiProperty({ example: 1, description: 'Room type ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomTypeId!: number;

  @ApiProperty({ example: 1, description: 'Rate plan ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ratePlanId!: number;

  @ApiProperty({ example: '2026-06-01', description: 'Check-in date (YYYY-MM-DD)' })
  @Type(() => Date)
  @IsDate()
  @Validate(CheckInBeforeCheckOut)
  checkInDate!: Date;

  @ApiProperty({ example: '2026-06-03', description: 'Check-out date (YYYY-MM-DD)' })
  @Type(() => Date)
  @IsDate()
  checkOutDate!: Date;

  @ApiProperty({ example: 2, description: 'Number of adults' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numAdults!: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Number of children' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numChildren = 0;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Number of rooms needed' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomsNeeded = 1;
}
