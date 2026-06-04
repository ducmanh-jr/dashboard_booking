import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PartnerService } from './partner.service';
import { discount_type_enum } from '@prisma/client';

import { BadRequestException } from '@nestjs/common';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Mã voucher chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới',
  })
  code!: string;

  @IsEnum(discount_type_enum)
  @IsNotEmpty()
  discountType!: discount_type_enum;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  discountValue!: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  minOrderAmount!: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxDiscount?: number;

  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @IsString()
  @IsNotEmpty()
  endDate!: string;

  @IsInt()
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  maxUses?: number;

  @IsInt()
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  maxUsesPerUser?: number;

  @IsString()
  @IsOptional()
  name?: string;
}

@ApiTags('Partner Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/vouchers')
export class PartnerVouchersController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a voucher for the partner properties' })
  createVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVoucherDto,
  ) {
    return this.partnerService.createVoucher(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vouchers of the partner' })
  getVouchers(@CurrentUser() user: AuthenticatedUser) {
    return this.partnerService.getVouchers(user);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete/deactivate a voucher' })
  deleteVoucher(
    @CurrentUser() user: AuthenticatedUser,
    @Query('code') queryCode?: string,
    @Body('code') bodyCode?: string,
  ) {
    const code = queryCode || bodyCode;
    if (!code) {
      throw new BadRequestException('Voucher code is required');
    }
    return this.partnerService.deleteVoucher(user, code);
  }

  @Delete(':code')
  @ApiOperation({ summary: 'Delete/deactivate a voucher by code' })
  deleteVoucherParam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
  ) {
    return this.partnerService.deleteVoucher(user, code);
  }
}