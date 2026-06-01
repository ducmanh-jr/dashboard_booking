import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { user_type_enum } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthService,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
  SafeUser,
} from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a customer account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
  })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(@Body() registerDto: RegisterDto): Promise<SafeUser> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login successful and access token returned.',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(loginDto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    this.setSessionCookies(response, result.accessToken, result.user.userType);
    return result;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Refresh token rotated successfully.',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshResponse> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Login or register via Google Identity Services (GIS)' })
  @ApiBody({ type: GoogleLoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login via Google successful, tokens and user info returned.',
  })
  @ApiResponse({ status: 401, description: 'Invalid Google credential.' })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.googleLogin(dto.credential, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    this.setSessionCookies(response, result.accessToken, result.user.userType);
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout current device session' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully.',
  })
  @ApiResponse({ status: 401, description: 'Invalid active session.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponse> {
    this.clearSessionCookies(response);
    return this.authService.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Successfully fetched current user.',
  })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const fullUser = await this.authService.getUserById(user.id);
    return { user: this.toFrontendUser(fullUser) };
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

  private toFrontendUser(user: Awaited<ReturnType<AuthService['getUserById']>>) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.userType,
      status: user.status,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
      title: user.isSuperAdmin ? 'Admin tổng' : 'Quản trị viên',
    };
  }
}

