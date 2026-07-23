import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../common/middlewares/fileupload/singlefileupload.middleware';
import type { Request, Response } from 'express';
import { VerifyEmailDto } from './dto/verifyEmail.dto';
import {
  ModerateThrottler,
  StrictThrottler,
} from '../../common/decorators/custom-throttler.decorator';
import { AuthV2Service } from './authv2.service';
import { ConfigService } from '@nestjs/config';
import { ResendOtpDto } from './dto/resendOtp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verifyOtp.dto';
import ms from 'ms';
import {
  avatarStorage,
  companyLogosStorage,
  resumeStorage,
} from '../../common/config/cloudinary.storage';

/**
 *! Auth V1 API controller
 */
@ApiTags('Auth v2')
@Controller({
  path: 'auth',
  version: '2',
})
export class AuthV2Controller {
  //! DI
  constructor(
    private readonly authV2Service: AuthV2Service,
    private readonly configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   *! Register/ SignUp User
   */
  @Post('register')
  @HttpCode(201)
  @StrictThrottler()
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: String,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed or user already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ message: string }> {
    return this.authV2Service.register(registerDto);
  }

  /**
   *! Verify Email
   */
  @Post('verify_email')
  @HttpCode(201)
  @StrictThrottler()
  @ApiOperation({
    summary: 'Verifies entered email via OTP from gmail',
  })
  @ApiBody({
    type: VerifyEmailDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Email verified successfully',
    type: String,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed or user already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authV2Service.verifyEmail(verifyEmailDto);
  }

  /**
   *! Login User
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @StrictThrottler()
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticates a user and returns access token, refresh token stored in httpOnly cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid credentials or Email is unverified.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authV2Service.login(loginDto);

    const ttl = loginDto.rememberMe
      ? Number(ms(this.configService.getOrThrow('REFRESH_TOKEN_REMEMBER_TIME')))
      : Number(ms(this.configService.getOrThrow('REFRESH_TOKEN_TIME')));

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite:
        this.configService.get('NODE_ENV') === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: ttl,
    });

    return {
      accessToken,
      user,
    };
  }

  //! Refresh access token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth('JWT-auth')
  @StrictThrottler()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'New access token generated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or expired refresh token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async refresh(
    // @GetUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken)
      throw new UnauthorizedException(
        'Refresh Token not found in the http-only cookie',
      );

    const { accessToken, newRefreshToken, user, remainingMs } =
      await this.authV2Service.refreshTokens(refreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite:
        this.configService.get('NODE_ENV') === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: remainingMs,
    });

    return {
      accessToken,
      user,
    };
  }

  //! Forgot Password
  @Post('forgot_password')
  @HttpCode(HttpStatus.OK)
  @StrictThrottler()
  @ApiOperation({
    summary: 'Forgot Password',
    description: 'Sends OTP at gmail to reset user password',
  })
  @ApiBody({
    type: ForgotPasswordDto,
  })
  @ApiResponse({
    status: 200,
    description: 'OTP Send to your email address',
    type: String,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found with this email address',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authV2Service.forgotPassword(dto.email);
  }

  //! Verify OTP
  @Post('verify_otp')
  @StrictThrottler()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verifies your OTP',
  })
  @ApiBody({
    type: VerifyOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Your OTP is valid',
    type: Boolean,
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authV2Service.verifyOtp(dto.email, dto.otp, dto.type);
  }

  //! Resend Email Verification OTP
  @Post('resend_verification_otp')
  @StrictThrottler()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resends Otp to your email address',
  })
  @ApiBody({
    type: ResendOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Otp send to your email',
    type: Boolean,
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async resendVerifyOtp(@Body() dto: ResendOtpDto) {
    return this.authV2Service.resendOtp(dto.email, 'VERIFY_EMAIL');
  }

  //! Resend Email Verification OTP
  @Post('resend_forgot_password_otp')
  @StrictThrottler()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verifies your Email',
  })
  @ApiBody({
    type: ResendOtpDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Your OTP is valid',
    type: Boolean,
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async resendForgotOtp(@Body() dto: ResendOtpDto) {
    return this.authV2Service.resendOtp(dto.email, 'FORGOT_PASSWORD');
  }

  //! Reset Password
  @Post('reset_password')
  @StrictThrottler()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resets Password',
    description: 'Resets user password with new password',
  })
  @ApiBody({
    type: ResetPasswordDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Password Succeessfully reset',
    type: String,
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authV2Service.resetPassword(dto.email, dto.newPassword);
  }

  /**
   *! Logout user and invalidate refresh token
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @StrictThrottler()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Logs out the user and invalidates the refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or expired access token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async logout(@GetUser('id') userId: string): Promise<{ message: string }> {
    await this.authV2Service.logout(userId);
    return {
      message: 'Successfully logged out',
    };
  }

  /**
   *! Get Current User Info/ Logged in User Details
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ModerateThrottler()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current logged in user',
  })
  @ApiResponse({
    status: 200,
    description: 'Password Succeessfully reset',
    type: AuthResponseDto,
  })
  async getMe(@Req() req: any) {
    return await req.user;
  }

  /**
   *! Upload Avatar
   */
  @Post('upload/avatar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ModerateThrottler()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload avatar image',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
    }),
  )
  uploadAvatar(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      url: file.path,
      publicId: file.filename,
    };
  }

  /**
   *! Upload Company Logo
   */
  @Post('upload/company-logo')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ModerateThrottler()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload company logo',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: companyLogosStorage,
    }),
  )
  uploadCompanyLogo(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      url: file.path,
      publicId: file.filename,
    };
  }

  /**
   *! Upload Resume
   */
  @Post('upload/resume')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ModerateThrottler()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload resume',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: resumeStorage,
    }),
  )
  uploadResume(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      url: file.path,
      publicId: file.filename,
    };
  }
}
