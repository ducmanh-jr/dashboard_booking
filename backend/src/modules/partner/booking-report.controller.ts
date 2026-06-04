import {
  Controller,
  Get,
  UseGuards,
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

@ApiTags('Partner Booking Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/booking-report')
export class PartnerBookingReportController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get()
  @ApiOperation({ summary: 'Get booking and revenue report for host properties' })
  @ApiResponse({ status: 200, description: 'Booking report retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Partner role is required.' })
  getBookingReport(@CurrentUser() user: AuthenticatedUser) {
    return this.partnerService.getBookingReport(user);
  }
}