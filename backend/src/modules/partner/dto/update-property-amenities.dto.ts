import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

const toNumberArray = ({ value }: { value: unknown }): unknown => {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => Number(item));
};

export class UpdatePropertyAmenitiesDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @Transform(toNumberArray)
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  amenity_ids!: number[];
}
