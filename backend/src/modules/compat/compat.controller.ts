import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
import { user_type_enum } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CompatService } from './compat.service';

const avatarUploadDirectory = join(process.cwd(), 'uploads', 'avatars');
const allowedAvatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const avatarExtensionsByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function avatarFileName(
  request: { user?: Partial<AuthenticatedUser> },
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  const extension = avatarExtensionsByMimeType[file.mimetype] ?? (extname(file.originalname || '').toLowerCase() || '.jpg');
  const safeUserId = String(request.user?.id ?? 'user').replace(/[^a-zA-Z0-9_-]/g, '');
  callback(null, `${safeUserId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
}

function avatarFileFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!allowedAvatarMimeTypes.has(file.mimetype)) {
    callback(new BadRequestException('File ảnh đại diện không hợp lệ'), false);
    return;
  }
  callback(null, true);
}

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

  @Post('account/avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_request, _file, callback) => {
        mkdirSync(avatarUploadDirectory, { recursive: true });
        callback(null, avatarUploadDirectory);
      },
      filename: avatarFileName,
    }),
    fileFilter: avatarFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadAccountAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.compatService.updateAccountAvatar(user, file);
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

  @Roles(Role.ADMIN)
  @Post('admin/bookings/:id/cancel')
  adminCancelBooking(@Param('id') id: string) {
    return this.compatService.adminCancelBooking(id);
  }

  @Roles(Role.ADMIN)
  @Post('admin/bookings/:id/mark-paid')
  adminMarkBookingPaid(@Param('id') id: string) {
    return this.compatService.adminMarkBookingPaid(id);
  }

  @Roles(Role.ADMIN)
  @Post('admin/bookings/:id/reject-cancel')
  adminRejectBookingCancel(@Param('id') id: string) {
    return this.compatService.adminRejectBookingCancel(id);
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
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.markNotificationRead(user, id);
  }

  @Post('notifications/read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.markAllNotificationsRead(user);
  }

  @Delete('notifications/:id')
  deleteNotification(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compatService.deleteNotification(user, id);
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

  @Roles(Role.PARTNER)
  @Get('partner/nowayhomepay/status')
  getNowayhomePayStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.getNowayhomePayStatus(user);
  }

  @Roles(Role.PARTNER)
  @Post('partner/nowayhomepay/register')
  registerNowayhomePay(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.registerNowayhomePay(user, body);
  }

  @Roles(Role.PARTNER)
  @Post('partner/nowayhomepay/transaction')
  addPartnerSelfTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.addPartnerSelfTransaction(user, body);
  }

  @Roles(Role.ADMIN)
  @Get('admin/transactions')
  getAdminTransactions() {
    return this.compatService.getAdminTransactions();
  }

  @Roles(Role.ADMIN)
  @Get('admin/transactions/dashboard')
  getAdminTransactionsDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.compatService.getAdminTransactionsDashboard(user);
  }

  @Roles(Role.ADMIN)
  @Post('admin/system/transaction')
  addSystemTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.addSystemTransaction(user, body);
  }

  @Roles(Role.ADMIN)
  @Post('admin/system/pay-tax')
  paySystemTax(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.paySystemTax(user, body);
  }

  @Roles(Role.ADMIN)
  @Post('admin/partner/transaction')
  addPartnerTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.compatService.addPartnerTransaction(user, body);
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
