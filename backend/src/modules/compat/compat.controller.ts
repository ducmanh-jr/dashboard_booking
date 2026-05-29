import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { user_type_enum } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CompatService } from './compat.service';

@Controller()
export class CompatController {
  constructor(
    private readonly authService: AuthService,
    private readonly compatService: CompatService,
  ) {}

  @Public()
  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }

  @Public()
  @Post('customer/auth/register')
  async registerCustomer(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.register({
      ...body,
      userType: user_type_enum.customer,
    } as never);
    const result = await this.authService.login(
      {
        email: typeof body.email === 'string' ? body.email : '',
        password: typeof body.password === 'string' ? body.password : '',
      },
      {},
    );
    this.setSessionCookies(response, result.accessToken, result.user.userType);
    return result;
  }

  @Public()
  @Post('partner/auth/register')
  registerPartner(@Body() body: Record<string, unknown>) {
    return this.authService.register({
      ...body,
      businessName: body.businessName ?? body.hotelName ?? body.fullName,
      userType: user_type_enum.partner,
    } as never);
  }

  @Get('account')
  accountOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.accountOverview(user);
  }

  @Patch('account/profile')
  updateAccountProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.updateAccountProfile(user, body);
  }

  @Get('account/avatar-upload-url')
  avatarUploadUrl(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.getAvatarUploadUrl(user);
  }

  /**
   * Dành cho user đã login (qua Google) muốn nộp đơn làm đối tác.
   * Không tạo user mới — chỉ nâng cấp user hiện tại lên partner.
   */
  @Post('partner/apply')
  async applyPartner(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.applyAsPartner(user.id, {
      businessName: (body.hotelName ?? body.businessName ?? body.fullName ?? '') as string,
      phone: body.phone as string | undefined,
    });
    // Đăng xuất user khỏi phiên làm việc hiện tại và yêu cầu chờ phê duyệt
    this.clearSessionCookies(response);
    return { success: true, pending: true };
  }

  @Public()
  @Get('public/rooms')
  searchRooms(@Query() query: Record<string, string>) {
    return this.compatService.searchRooms(query);
  }

  @Public()
  @Get('public/rooms/:slug')
  roomDetail(@Param('slug') slug: string) {
    return this.compatService.roomDetail(slug);
  }

  @Roles(Role.PARTNER)
  @Get('partner/rooms')
  partnerRooms(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.partnerRooms(user);
  }

  @Roles(Role.PARTNER)
  @Get('partner/rooms/:id')
  partnerRoom(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.partnerRoom(user, id);
  }

  @Roles(Role.PARTNER)
  @Post('partner/rooms')
  createPartnerRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.createPartnerRoom(user, body);
  }

  @Roles(Role.PARTNER)
  @Patch('partner/rooms/:id')
  updatePartnerRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.updatePartnerRoom(user, id, body);
  }

  @Roles(Role.PARTNER)
  @Patch('partner/rooms/:id/request-update')
  requestUpdateRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.updatePartnerRoom(user, id, body);
  }

  @Roles(Role.PARTNER)
  @Delete('partner/rooms/:id')
  deletePartnerRoom(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.deletePartnerRoom(user, id);
  }

  @Roles(Role.PARTNER)
  @Delete('partner/rooms/:id/request-delete')
  requestDeleteRoom(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.deletePartnerRoom(user, id);
  }

  @Roles(Role.PARTNER)
  @Post('partner/rooms/:id/request-restore')
  requestRestoreRoom(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.requestRestorePartnerRoom(user, id);
  }

  @Roles(Role.PARTNER)
  @Get('partner/availability')
  availability(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string>) {
    return this.compatService.availability(user, query);
  }

  @Roles(Role.PARTNER)
  @Patch('partner/availability')
  updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.updateAvailability(user, body);
  }

  @Roles(Role.PARTNER)
  @Patch('partner/availability/bulk')
  bulkUpdateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.bulkUpdateAvailability(user, body);
  }

  @Roles(Role.ADMIN)
  @Get('admin/stats')
  adminStats(@Query('period') period = 'month') {
    return this.compatService.adminStats(period);
  }

  @Roles(Role.ADMIN)
  @Get('admin/customers')
  customers(@Query('search') search = '') {
    return this.compatService.customers(search);
  }

  @Roles(Role.ADMIN)
  @Get('admin/admins')
  admins() {
    return this.compatService.admins();
  }

  @Roles(Role.ADMIN)
  @Post('admin/admins')
  createAdmin(@Body() body: Record<string, unknown>) {
    return this.compatService.createAdmin(body);
  }

  @Roles(Role.ADMIN)
  @Post('admin/admins/google')
  createGoogleAdmin(@Body() body: Record<string, unknown>) {
    return this.compatService.createGoogleAdmin(body);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/admins/:id')
  updateAdmin(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.compatService.updateAdmin(id, body);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/admins/:id')
  deleteAdmin(@Param('id') id: string) {
    return this.compatService.deleteUser(id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/partners')
  partners(@Query('status') status?: string) {
    return this.compatService.partners(status);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/partners/:id')
  updatePartner(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.compatService.updatePartner(id, body);
  }

  @Roles(Role.ADMIN)
  @Post('admin/partners/:id/approve')
  approvePartner(@Param('id') id: string) {
    return this.compatService.setPartnerStatus(id, 'approved');
  }

  @Roles(Role.ADMIN)
  @Post('admin/partners/:id/reject')
  rejectPartner(@Param('id') id: string) {
    return this.compatService.setPartnerStatus(id, 'rejected');
  }

  @Roles(Role.ADMIN)
  @Delete('admin/partners/:id')
  deletePartner(@Param('id') id: string) {
    return this.compatService.deleteUser(id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/partners/:id/rooms')
  partnerRoomsForAdmin(@Param('id') id: string) {
    return this.compatService.partnerRoomsForAdmin(id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/rooms')
  adminRooms(@Query('status') status = 'all') {
    return this.compatService.adminRooms(status);
  }

  @Roles(Role.ADMIN)
  @Post('admin/rooms/:id/approve')
  approveRoom(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.setRoomStatus(user, id, 'active');
  }

  @Roles(Role.ADMIN)
  @Post('admin/rooms/:id/reject')
  rejectRoom(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.setRoomStatus(user, id, 'rejected');
  }

  @Roles(Role.ADMIN)
  @Patch('admin/rooms/:id')
  updateRoom(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.compatService.adminUpdateRoom(id, body);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/rooms/:id')
  deleteRoom(@Param('id') id: string) {
    return this.compatService.adminDeleteRoom(id);
  }

  @Roles(Role.ADMIN)
  @Post('admin/room-change-requests/:id/approve')
  approveChangeRequest() {
    return { ok: true };
  }

  @Roles(Role.ADMIN)
  @Post('admin/room-change-requests/:id/reject')
  rejectChangeRequest() {
    return { ok: true };
  }

  @Roles(Role.ADMIN)
  @Get('admin/booking-report')
  adminBookingReport() {
    return this.compatService.bookingReport();
  }

  @Roles(Role.PARTNER)
  @Get('partner/booking-report')
  partnerBookingReport(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.bookingReport(user);
  }

  @Roles(Role.PARTNER)
  @Post('partner/bookings/:id/:action')
  partnerBookingAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('action') action: string,
  ) {
    return this.compatService.partnerBookingAction(user, id, action);
  }

  @Roles(Role.CUSTOMER)
  @Get('bookings/mine')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.mine(user);
  }

  @Roles(Role.CUSTOMER)
  @Get('bookings/:id/status')
  bookingStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.bookingStatus(user, id);
  }

  @Roles(Role.CUSTOMER)
  @Post('bookings')
  createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.createBooking(user, body);
  }

  @Roles(Role.CUSTOMER)
  @Post('mock-payment')
  mockPayment(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.compatService.mockPayment(user, body);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.notifications(user);
  }

  @Get('notifications/unread-count')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.unreadCount(user);
  }

  @Post('notifications/:id/read')
  markRead() {
    return this.compatService.markNotificationRead();
  }

  @Post('notifications/read-all')
  markAllRead() {
    return this.compatService.markAllNotificationsRead();
  }

  @Delete('notifications/:id')
  deleteNotification() {
    return this.compatService.deleteNotification();
  }

  @Public()
  @Get('places/search')
  placesSearch(@Query('q') q = '') {
    return this.compatService.placesSearch(q);
  }

  @Public()
  @Get('places/nearby')
  placesNearby(@Query() query: Record<string, string>) {
    return this.compatService.placesNearby(query);
  }

  private setSessionCookies(
    response: Response,
    token: string,
    userType: user_type_enum,
  ): void {
    const options = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
    };
    response.cookie('session', token, options);
    response.cookie(`session_${userType}`, token, options);
  }

  private clearSessionCookies(response: Response): void {
    for (const name of ['session', 'session_customer', 'session_partner', 'session_admin']) {
      response.clearCookie(name, { path: '/' });
    }
  }
}
