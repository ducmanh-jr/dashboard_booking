import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AdminService } from './admin.service';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { UpdatePropertyStatusDto } from './dto/update-property-status.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('partners/:partnerProfileId/kyc')
  @ApiOperation({ summary: 'Approve or reject a partner KYC application' })
  @ApiResponse({
    status: 200,
    description: 'Partner KYC status updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  updateKycStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: UpdateKycStatusDto,
  ) {
    return this.adminService.updateKycStatus(user, partnerProfileId, dto);
  }

  @Patch('partners/:partnerProfileId/status')
  @ApiOperation({ summary: 'Approve or reject a partner status' })
  @ApiResponse({
    status: 200,
    description: 'Partner status updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  updatePartnerStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: { status: 'active' | 'approved' | 'rejected'; reason?: string },
  ) {
    const status = dto.status === 'active' ? 'approved' : dto.status;
    return this.adminService.updateKycStatus(user, partnerProfileId, { status });
  }

  @Patch('properties/:propertyId/status')
  @ApiOperation({ summary: 'Approve, reject, or suspend a property listing' })
  @ApiResponse({
    status: 200,
    description: 'Property moderation status updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  updatePropertyStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdatePropertyStatusDto,
  ) {
    return this.adminService.updatePropertyStatus(user, propertyId, dto);
  }

  // ── Booking report ─────────────────────────────────────────────────────────

  @Get('booking-report')
  @ApiResponse({ status: 200, description: 'Booking report retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  getBookingReport() {
    return this.adminService.fetchBookingReport();
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  getBookings() {
    return this.adminService.fetchBookings();
  }

  @Post('bookings/:bookingId/mark-paid')
  @ApiOperation({ summary: 'Mark booking payment status as paid' })
  @ApiResponse({ status: 200, description: 'Booking marked as paid.' })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  markBookingPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.adminService.markBookingPaid(user, bookingId);
  }

  @Post('bookings/:bookingId/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled.' })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  cancelBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.adminService.cancelBooking(user, bookingId);
  }

  @Post('bookings/:bookingId/reject-cancel')
  @ApiOperation({ summary: 'Reject a booking cancellation request' })
  @ApiResponse({ status: 200, description: 'Booking cancellation request rejected.' })
  @ApiResponse({ status: 403, description: 'Admin role is required.' })
  rejectCancelBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.adminService.rejectCancelBooking(user, bookingId);
  }
}
