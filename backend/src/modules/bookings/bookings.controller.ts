import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Booking } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  BookingsService,
  type CancellationResult,
  type ReviewResult,
} from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingCreateReviewDto } from './dto/create-review.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking with locked room inventory' })
  @ApiResponse({ status: 201, description: 'Booking created.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid dates or no availability.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.create(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'List bookings for the current customer' })
  @ApiResponse({
    status: 200,
    description: 'Returns bookings for the authenticated customer.',
  })
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<Booking[]> {
    return this.bookingsService.findMine(user);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Alias for /bookings/me' })
  @ApiResponse({
    status: 200,
    description: 'Returns bookings for the authenticated customer.',
  })
  findMyBookings(@CurrentUser() user: AuthenticatedUser): Promise<Booking[]> {
    return this.bookingsService.findMine(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Returns booking details.',
  })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Booking> {
    return this.bookingsService.findOne(id, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking and restore availability' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Booking cancelled and availability restored.',
  })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CancellationResult> {
    return this.bookingsService.cancel(user, id);
  }

  @Post(':id/request-cancel')
  @ApiOperation({ summary: 'Customer requests booking cancellation' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 201, description: 'Cancellation request submitted.' })
  requestCancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<any> {
    return this.bookingsService.requestCancel(user, id, reason || '');
  }

  @Post(':id/reviews')
  @ApiOperation({ summary: 'Review a checked-out booking' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 201, description: 'Booking review created.' })
  @ApiResponse({
    status: 400,
    description: 'Booking is not eligible for a review.',
  })
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: BookingCreateReviewDto,
  ): Promise<ReviewResult> {
    return this.bookingsService.createReview(user, id, dto);
  }
}
