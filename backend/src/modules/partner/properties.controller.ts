import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
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
import { CreatePropertyDto } from './dto/create-property.dto';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdatePropertyAmenitiesDto } from './dto/update-property-amenities.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpsertPropertyPoliciesDto } from './dto/upsert-property-policies.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner Properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/properties')
export class PartnerPropertiesController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft property for the current partner' })
  @ApiResponse({ status: 201, description: 'Draft property created.' })
  @ApiResponse({ status: 403, description: 'Partner role is required.' })
  createProperty(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.partnerService.createProperty(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update owned property details' })
  @ApiResponse({ status: 200, description: 'Owned property updated.' })
  @ApiResponse({ status: 404, description: 'Property not found or not owned.' })
  updateProperty(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');

    return this.partnerService.updateProperty(user, propertyId, dto);
  }

  @Post(':id/policies')
  @ApiOperation({ summary: 'Create or update owned property policies' })
  @ApiResponse({ status: 201, description: 'Property policies saved.' })
  @ApiResponse({ status: 404, description: 'Property not found or not owned.' })
  upsertPolicies(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertPropertyPoliciesDto,
  ) {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');

    return this.partnerService.upsertPropertyPolicies(user, propertyId, dto);
  }

  @Post(':id/amenities')
  @ApiOperation({ summary: 'Replace amenities for an owned property' })
  @ApiResponse({ status: 201, description: 'Property amenities replaced.' })
  @ApiResponse({ status: 404, description: 'Property not found or not owned.' })
  updateAmenities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyAmenitiesDto,
  ) {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');

    return this.partnerService.updatePropertyAmenities(user, propertyId, dto);
  }

  @Post(':id/room-types')
  @ApiOperation({ summary: 'Create a room type for an owned property' })
  @ApiResponse({ status: 201, description: 'Room type created.' })
  @ApiResponse({ status: 404, description: 'Property not found or not owned.' })
  createRoomType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateRoomTypeDto,
  ) {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');

    return this.partnerService.createRoomType(user, propertyId, dto);
  }
}
