import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Get active vouchers for a property' })
  getActiveVouchers(@Query('propertyId') propertyId: string) {
    return this.vouchersService.getActiveVouchers(propertyId);
  }

  @Public()
  @Post('apply')
  @ApiOperation({ summary: 'Apply a voucher code' })
  applyVoucher(@Body() body: { code: string; propertyId: string }) {
    return this.vouchersService.applyVoucher(body.code, body.propertyId);
  }
}
