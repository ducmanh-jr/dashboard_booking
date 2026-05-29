import { Body, Controller, Param, Patch } from '@nestjs/common';
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
}
