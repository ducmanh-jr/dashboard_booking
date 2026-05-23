import { Body, Controller, Param, Post } from '@nestjs/common';
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
import { CustomerCreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':bookingId')
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
    @Param('bookingId') bookingId: string,
    @Body() dto: CustomerCreateReviewDto,
  ) {
    return this.reviewsService.createReview(user, bookingId, dto);
  }
}
