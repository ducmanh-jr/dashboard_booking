import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { WebhookDto } from './dto/webhook.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout/:bookingId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment checkout session for a booking' })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created for the authenticated customer.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  checkout(@Param('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.checkout(bookingId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('process')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate successful payment processing' })
  @ApiResponse({
    status: 201,
    description: 'Payment processed successfully.',
  })
  processPayment(@Body('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.processPayment(bookingId, req.user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment provider webhook notification' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully.',
  })
  handleWebhook(@Body() dto: WebhookDto) {
    return this.paymentsService.handleWebhook(dto);
  }
}
