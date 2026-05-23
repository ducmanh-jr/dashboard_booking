import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
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
import { GenerateDailyRatesDto } from './dto/generate-daily-rates.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner Room Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/room-types')
export class PartnerRoomTypesController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post(':roomTypeId/daily-rates/generate')
  @ApiOperation({ summary: 'Generate daily inventory for a room type' })
  @ApiResponse({
    status: 201,
    description: 'Daily inventory and rates generated for the room type.',
  })
  @ApiResponse({
    status: 404,
    description: 'Room type not found or not owned.',
  })
  generateDailyRates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomTypeId') roomTypeId: string,
    @Body() dto: GenerateDailyRatesDto,
  ) {
    const parsedRoomTypeId = this.partnerService.parseBigIntParam(
      roomTypeId,
      'roomTypeId',
    );

    return this.partnerService.generateDailyRates(user, parsedRoomTypeId, dto);
  }
}
