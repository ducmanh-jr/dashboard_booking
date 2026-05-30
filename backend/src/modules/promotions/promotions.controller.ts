import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('Promotions')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả khuyến mãi' })
  @ApiQuery({ name: 'filter', required: false, enum: ['all', 'active', 'inactive', 'upcoming', 'expired'] })
  @ApiResponse({ status: 200, description: 'Danh sách promotion' })
  findAll(@Query('filter') filter: 'all' | 'active' | 'inactive' | 'upcoming' | 'expired' = 'all') {
    return this.promotionsService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một promotion' })
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo promotion mới' })
  @ApiResponse({ status: 201, description: 'Promotion đã được tạo' })
  create(
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.promotionsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật promotion' })
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Bật / tắt trạng thái promotion' })
  toggle(@Param('id') id: string) {
    return this.promotionsService.toggle(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm promotion' })
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }

  @Get(':id/vouchers')
  @ApiOperation({ summary: 'Lấy danh sách mã voucher của promotion' })
  findVouchers(@Param('id') id: string) {
    return this.promotionsService.findVouchers(id);
  }

  @Post(':id/vouchers')
  @ApiOperation({ summary: 'Tạo mã voucher mới cho promotion' })
  createVoucher(@Param('id') id: string, @Body() dto: CreateVoucherDto) {
    return this.promotionsService.createVoucher(id, dto);
  }
}
