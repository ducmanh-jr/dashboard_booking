import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { MediaService } from './media.service';

@ApiTags('Partner Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('presigned-url')
  @ApiOperation({ summary: 'Get Cloudinary presigned upload URL' })
  @ApiResponse({
    status: 200,
    description: 'Presigned upload URL returned for the requested folder.',
  })
  @ApiResponse({ status: 403, description: 'Partner role is required.' })
  getPresignedUrl(@Query('folder') folder: string = 'nowayhome/properties') {
    return this.mediaService.getPresignedUrl(folder);
  }
}
