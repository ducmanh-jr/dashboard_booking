import { Body, Controller, Param, Post, Get, UseInterceptors, UploadedFiles } from '@nestjs/common';
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
import { CreateReviewBodyDto } from './dto/create-review-body.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ReviewsService } from './reviews.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Submit a post-stay review for a completed booking',
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Booking is not eligible for a review.',
  })
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewBodyDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // Re-use the existing service method but map DTO fields.
    const { bookingId, ...reviewData } = dto;
    if (files && files.length > 0) {
      console.log(`[Review Upload] Received ${files.length} images for booking #${bookingId}:`);
      files.forEach((file, index) => {
        console.log(`  File ${index + 1}: name=${file.originalname}, mime=${file.mimetype}, size=${file.size}`);
      });
    }
    return this.reviewsService.createReview(user, bookingId, reviewData);
  }

  @Roles(Role.CUSTOMER)
  @Post(':bookingId')
  @ApiOperation({
    summary: 'Submit a post-stay review for a completed booking by booking ID',
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully.' })
  createReviewByBookingId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: Omit<CreateReviewBodyDto, 'bookingId'>,
  ) {
    return this.reviewsService.createReview(user, bookingId, dto);
  }

  @Public()
  @Get('property/:id')
  @ApiOperation({
    summary: 'Get all reviews for a property',
  })
  @ApiResponse({ status: 200, description: 'Returns property reviews.' })
  findByProperty(@Param('id') propertyId: string) {
    return this.reviewsService.findByProperty(propertyId);
  }
}
