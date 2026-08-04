import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { generateOtp, otpExpiry } from '../../common/utils/otp.util';
import { Otp } from './schemas/otp.schema';
import { MailService } from '../mail/mail.service';
import { VerifyEmailDto } from './dto/verifyEmail.dto';
import ms from 'ms';
import { ContextLogger } from '../../common/logger/context-logger';
import { LoggerFactory } from '../../common/logger/logger.factory';
import { Trace } from '../../common/telemetry/tracing/trace.decorator';
import { TraceService } from '../../common/telemetry/tracing/trace.service';
import { PrometheusService } from '../../common/prometheus/prometheus.service';
import { OtpRepository } from './repositories/otp.repository';
import { OtpType } from '../../common/enums/otpType';

// type OtpType = 'VERIFY_EMAIL' | 'FORGOT_PASSWORD';
/**
 *! Auth Service
 */
@Injectable()
export class AuthV2Service {
  private readonly SALT_ROUNDS = 10;
  private readonly logger: ContextLogger;

  //! Redis
  private getOtpTtl(): number {
    return (
      Number(
        ms(this.configService.getOrThrow('OTP_EXPIRY_TIME')),
      ) / 1000
    );
  }

  private async validateOtp(user: User, otp: string, type: OtpType): Promise<void> {

    const hashedOtp = await this.otpRepository.getOtp(user._id.toString(), type)

    if (!hashedOtp) {
      this.logger.warn('OTP validation failed - OTP not found or expired', {
        userId: user._id.toString(),
        type,
      });

      this.traceService.addCurrentEvent('OTP not found');

      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isValid = await bcrypt.compare(otp, hashedOtp);

    if (!isValid) {
      this.logger.warn('OTP validation failed - invalid OTP', {
        userId: user._id.toString(),
        type,
      });

      this.traceService.addCurrentEvent('Invalid OTP');

      throw new UnauthorizedException('Invalid or expired OTP');
    }

    this.traceService.addCurrentEvent('OTP validated');

    await this.otpRepository.deleteOtp(user._id.toString(), type);

    this.traceService.addCurrentEvent('OTP deleted');
  }

  private async issueOtp(user: User, type: OtpType): Promise<string> {

    const otp = generateOtp();

    const hashedOtp = await bcrypt.hash(otp, 10);

    await this.otpRepository.saveOtp({
      userId: user._id.toString(),
      type,
      hashedOtp,
      ttl: this.getOtpTtl(),
    });

    return otp;
  }

  //! Dependency Injection
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    @InjectModel(Otp.name) private otpModel: Model<Otp>,
    private jwtService: JwtService,
    private usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly otpRepository: OtpRepository,
    private readonly traceService: TraceService,
    private readonly prometheusService: PrometheusService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger =
      loggerFactory.create(
        AuthV2Service.name,
      );
  }

  //? Generate access and response tokens
  private async generateTokens(
    userId: any,
    email: string,
    role: string,
    rememberMe = false,
    refreshExpiresInSeconds?: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };
    const refreshId = randomBytes(16).toString('hex');

    const refreshExpires = refreshExpiresInSeconds
      ? `${refreshExpiresInSeconds}s`
      : rememberMe
        ? this.configService.get('REFRESH_TOKEN_REMEMBER_TIME') //7d
        : this.configService.get('REFRESH_TOKEN_TIME'); // 1d

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('ACCESS_TOKEN_TIME'),
      }),
      this.jwtService.signAsync(
        { ...payload, rid: refreshId },
        { expiresIn: refreshExpires },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  //? Update refresh token in database during logins etc
  async updateRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const hashed = await bcrypt.hash(refreshToken, 10);

    await this.UserModel.updateOne(
      { _id: userId }, // filter
      { $set: { refreshToken: hashed, refreshTokenExpiresAt: expiresAt } },
    );
  }

  //? Response for registration
  private buildResponse(user: any) {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      skills: user.skills,
      experience: user.experience,
      preferredCategory: user.preferredCategory,
      preferredLocation: user.preferredLocation,
      avatar: user.avatar,
      role: user.role,
      rememberMe: user.rememberMe,
      companyName: user.companyName || '',
      companyDescription: user.companyDescription || '',
      companyLogo: user.companyLogo || '',
      resume: user.resume || '',
    };
  }

  /**
   *! Refresh access token
   */
  @Trace('authv2.refresh-token')
  async refreshTokens(refreshToken: string) {
    this.logger.info('Refresh token request received')
    this.traceService.addCurrentEvent('Refresh token verification started');

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      this.traceService.setCurrentAttributes({
        'user.id': payload.sub
      });

      const user = await this.UserModel.findById(payload.sub).select('-password');

      if (!user || !user.refreshToken) {
        this.logger.warn('Refresh failed - refresh token not found', {
          userId: payload.sub,
        });
        this.traceService.addCurrentEvent('Refresh token not found');
        throw new UnauthorizedException("Refresh Token doesn't exist");
      }

      this.traceService.setCurrentAttributes({
        'user.role': user.role,
      });

      const matches = await bcrypt.compare(refreshToken, user.refreshToken);

      if (!matches) {
        this.logger.warn('Refresh failed - token mismatch', {
          userId: user.id,
        });

        this.traceService.addCurrentEvent(
          'Refresh token mismatch',
        );

        throw new ForbiddenException(
          'Refresh Token doesnot match',
        );
      }

      const remainingMs = user.refreshTokenExpiresAt.getTime() - Date.now();
      if (remainingMs <= 0) {
        this.logger.warn('Refresh failed - token expired', {
          userId: user.id,
        });

        this.traceService.addCurrentEvent(
          'Refresh token expired',
        );

        throw new UnauthorizedException(
          'Refresh token expired',
        );
      }

      this.traceService.setCurrentAttribute(
        'auth.remaining_ms',
        remainingMs,
      );

      const tokens = await this.generateTokens(
        user._id,
        user.email,
        user.role,
        undefined,
        Math.floor(remainingMs / 1000),
      );

      this.traceService.addCurrentEvent(
        'New JWT tokens generated',
      );

      await this.updateRefreshToken(
        user.id,
        tokens.refreshToken,
        user.refreshTokenExpiresAt,
      );

      this.traceService.addCurrentEvent(
        'Refresh token rotated',
      );

      this.logger.info('Access token refreshed successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        accessToken: tokens.accessToken,
        newRefreshToken: tokens.refreshToken,
        user: this.buildResponse(user),
        remainingMs,
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Refresh token operation failed',
        error,
      );

      throw error;
    }


  }

  /**
   *! Register a new user
   */
  @Trace('authv2.register')
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { name, email, password, role } = registerDto;

    this.logger.info('User registration requested', {
      email,
      role,
    });

    this.traceService.setCurrentAttributes({
      'auth.email': email,
      'auth.role': role,
    });

    const emailInUse = await this.usersService.findByEmail(email);
    if (emailInUse) {
      this.logger.warn('Registration failed - email already exists', {
        email,
      });
      this.traceService.addCurrentEvent('User with this email already exists');
      throw new BadRequestException('User with this email already exists');
    }
    this.traceService.addCurrentEvent('Email availability verified');

    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      this.traceService.addCurrentEvent('Password hashed');

      const user = await this.UserModel.create({
        name,
        email,
        password: hashedPassword,
        role,
        isEmailVerified: false,
        // avatar,
        // avatarPublicId,
      });

      this.prometheusService.usersRegistered.labels(user.role, 'email').inc();
      this.traceService.setCurrentAttributes({
        'user.id': user.id,
        'user.role': user.role,
      });

      this.traceService.addCurrentEvent(
        'User account created',
      );

      this.logger.info('User account created', {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      // Save OTP in otpModel
      // await this.otpModel.create({
      //   otp: hashedOtp,
      //   expiresAt: otpExpiry(this.configService.get('OTP_EXPIRY_TIME')), // e.g., 10 minutes
      //   userId: user._id,
      //   type: 'VERIFY_EMAIL',
      // });

      //! Redis for otp storage
      // await this.otpRepository.saveOtp({
      //   userId: user._id.toString(),
      //   type: OtpType.VERIFY_EMAIL,
      //   hashedOtp,
      //   ttl: this.getOtpTtl(),
      // })

      const otp = await this.issueOtp(user, OtpType.VERIFY_EMAIL);

      this.traceService.addCurrentEvent(
        'Verification OTP generated',
      );

      this.logger.debug('Email verification OTP generated', {
        userId: user._id.toString(),
      });

      const companyLogo = 'https://i.imgur.com/3KcynwC.png';

      const subject = `Verify Email Address via OTP`;

      const message = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <!-- Header with logo -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${companyLogo}" alt="Company Logo" style="width: 120px; height: auto;" />
          </div>

          <!-- Greeting -->
          <p style="font-size: 16px;">Hi <strong>${user.name}</strong>,</p>

          <!-- Main message -->
          <h2 style="font-size: 16px;">
            Your OTP is: "<strong>${otp}</strong>"
          </h2>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            This email was sent by <strong>Job Seeker Pvt. Ltd.</strong>. Please do not reply directly to this email.
          </p>
        </div>
      `;

      await this.mailService.sendMail(user.email, subject, message, message);
      this.traceService.addCurrentEvent(
        'Verification email sent',
      );

      this.logger.info('Verification email sent', {
        userId: user.id,
        email: user.email,
      });

      this.logger.info('User registration completed successfully', {
        userId: user.id,
      });
      this.prometheusService.otpSent.labels('email_verification').inc();

      return { message: `Verify Otp sent to your email: ${user.email}` };
    } catch (error) {
      this.traceService.setCurrentError(error);
      this.logger.error('User registration failed', error, {
        email,
        role,
      });
      throw error;
    }
  }

  /**
   *! Verify Email
   */
  @Trace('authv2.verify-email')
  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const { email, otp } = dto;

    this.logger.info('Email verification requested', {
      email,
    });

    this.traceService.setCurrentAttributes({
      'auth.email': email,
    });

    try {
      // Find the user
      const user = await this.UserModel.findOne({ email });

      if (!user) {
        this.logger.warn('Email verification failed - user not found', {
          email,
        });
        this.traceService.addCurrentEvent('Invalid email');
        throw new BadRequestException('Invalid email');
      }

      this.traceService.setCurrentAttributes({
        'user.id': user.id,
        'user.role': user.role,
      });

      if (user.isEmailVerified) {
        this.logger.warn('Email verification skipped - already verified', {
          userId: user.id,
          email: user.email,
        });
        this.traceService.addCurrentEvent('Email already verified');
        throw new BadRequestException('Email already verified');
      }

      //! Redis otp
      await this.validateOtp(user, otp, OtpType.VERIFY_EMAIL);
      user.isEmailVerified = true;
      await user.save();

      this.traceService.addCurrentEvent(
        'User email verified',
      );
      this.logger.info('User email verified', {
        userId: user.id,
        email: user.email,
      });

      // Generate access & refresh tokens
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        false, // rememberMe
      );

      this.traceService.addCurrentEvent(
        'JWT tokens generated',
      );

      const ttl = Number(
        ms(this.configService.getOrThrow('REFRESH_TOKEN_TIME')),
      );

      // Save refresh token in DB
      const refreshTokenExpiresAt = new Date(Date.now() + ttl);

      await this.updateRefreshToken(
        user.id,
        tokens.refreshToken,
        refreshTokenExpiresAt,
      );

      this.traceService.addCurrentEvent(
        'Refresh token updated',
      );
      this.logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      return { message: 'Email verified successfully. You can now login.' };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error('Email verification failed', error, {
        email,
      });

      throw error;
    }
  }

  /**
   *! Login User
   */
  @Trace('authv2.login')
  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;

    this.logger.info('Login request received', {
      email,
      rememberMe,
    });

    this.traceService.setCurrentAttributes({
      'auth.email': email,
      'auth.remember_me': rememberMe,
    });

    try {
      const refreshExpiresAt = rememberMe
        ? new Date(
          Date.now() +
          Number(
            ms(this.configService.getOrThrow('REFRESH_TOKEN_REMEMBER_TIME')),
          ),
        )
        : new Date(
          Date.now() +
          Number(ms(this.configService.getOrThrow('REFRESH_TOKEN_TIME'))),
        );

      const user = await this.usersService.findByEmail(email);

      if (!user) {
        this.prometheusService.loginFailures
          .labels('user_not_found')
          .inc();
        this.logger.warn('Login failed - user not found', { email });

        this.traceService.addCurrentEvent('User not found');

        throw new UnauthorizedException(
          'Invalid email or password',
        );
      }

      const validPassword = await bcrypt.compare(
        password.trim(),
        user.password.trim(),
      );

      if (!validPassword) {
        this.prometheusService.loginFailures
          .labels('invalid_password')
          .inc();
        this.logger.warn('Login failed - invalid password', {
          userId: user._id.toString(),
        });

        this.traceService.addCurrentEvent(
          'Invalid password',
        );

        throw new UnauthorizedException(
          'Invalid email or password',
        );
      }

      if (!user.isEmailVerified) {
        this.prometheusService.loginFailures
          .labels('email_not_verified')
          .inc();
        this.logger.warn(
          'Login failed - email not verified',
          {
            userId: user.id,
          },
        );

        this.traceService.addCurrentEvent(
          'Email not verified',
        );
        throw new UnauthorizedException('Please verify your email first');
      }

      this.traceService.setCurrentAttributes({
        'user.id': user.id,
        'user.role': user.role,
      });

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        rememberMe,
      );

      this.traceService.addCurrentEvent(
        'JWT tokens generated',
      );

      await this.updateRefreshToken(
        user.id,
        tokens.refreshToken,
        refreshExpiresAt,
      );

      this.traceService.addCurrentEvent(
        'Refresh token updated',
      );

      this.prometheusService.userLogins
        .labels(user.role, 'email')
        .inc();

      this.logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.buildResponse(user),
      };
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        this.prometheusService.loginFailures
          .labels('internal_error')
          .inc();
      }
      this.traceService.setCurrentError(error);
      this.logger.error('Login failed', error, {
        email,
      });
      throw error;
    }
  }

  /**
   *! Forgot password
   */
  @Trace('authv2.forgot-password')
  async forgotPassword(email: string): Promise<{ message: string }> {

    this.logger.info('Forgot password requested', { email });

    this.traceService.setCurrentAttributes({
      'auth.email': email,
    });

    try {
      const user = await this.UserModel.findOne({ email });

      if (!user) {
        this.logger.warn('Forgot password failed - user not found', {
          email,
        });
        this.traceService.addCurrentEvent('User not found');
        throw new NotFoundException('User not Found');
      }
      this.traceService.setCurrentAttributes({
        'user.id': user.id,
        'user.role': user.role,
      });
      this.traceService.addCurrentEvent(
        'User found',
      );

      const otp = await this.issueOtp(user, OtpType.FORGOT_PASSWORD);

      this.traceService.addCurrentEvent(
        'Password reset OTP stored',
      );

      const companyLogo = 'https://i.imgur.com/3KcynwC.png';

      const subject = `JobSeeker Reset Password OTP`;

      const message = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <!-- Header with logo -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${companyLogo}" alt="Company Logo" style="width: 120px; height: auto;" />
          </div>

          <!-- Greeting -->
          <p style="font-size: 16px;">Hi <strong>${user.name}</strong>,</p>

          <!-- Main message -->
          <h2 style="font-size: 16px;">
            Your OTP is: "<strong>${otp}</strong>"
          </h2>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            This email was sent by <strong>Job Seeker Pvt. Ltd.</strong>. Please do not reply directly to this email.
          </p>
        </div>
      `;

      await this.mailService.sendMail(user.email, subject, message, message);
      this.prometheusService.otpSent.labels('password_reset').inc();
      this.traceService.addCurrentEvent(
        'Password reset email sent',
      );

      this.logger.info(
        'Password reset OTP sent successfully',
        {
          userId: user.id,
          email: user.email,
        },
      );
      return { message: `OTP has been sent to your email: ${user.email}` };

    } catch (error) {
      this.traceService.setCurrentError(error);
      this.logger.error('Forgot password failed', error, { email });
      throw error;
    }
  }

  /**
   *! Verify Otp
   */
  @Trace('authv2.verify-otp')
  async verifyOtp(
    email: string,
    otp: string,
    type: 'VERIFY_EMAIL' | 'FORGOT_PASSWORD',
  ): Promise<boolean> {

    this.logger.info('OTP verification requested', {
      email,
      type,
    });

    this.traceService.setCurrentAttributes({
      'auth.email': email,
      'auth.otp_type': type,
    });

    try {
      const user = await this.UserModel.findOne({ email });
      if (!user) {
        this.logger.warn('OTP verification failed - user not found', {
          email,
          type,
        });

        this.traceService.addCurrentEvent('User not found');

        throw new UnauthorizedException();
      }

      this.traceService.setCurrentAttributes({
        'user.id': user.id,
        'user.role': user.role,
      });

      this.traceService.addCurrentEvent('User found');

      await this.validateOtp(user, otp, type as OtpType);

      this.logger.info('OTP verified successfully', {
        userId: user.id,
        type,
      });

      return true;

    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'OTP verification failed',
        error,
        {
          email,
          type,
        },
      );

      throw error;
    }
  }

  /**
   *! Resend Otp
   */
  @Trace('authv2.resend-otp')
  async resendOtp(
    email: string,
    type: 'VERIFY_EMAIL' | 'FORGOT_PASSWORD',
  ): Promise<{ message: string }> {

    this.logger.info('OTP resend requested', {
      email,
      type,
    });

    this.traceService.setCurrentAttributes({
      'auth.email': email,
      'auth.otp_type': type,
    });

    try {
      const user = await this.UserModel.findOne({ email });

      if (!user) {
        this.logger.warn('OTP resend failed - user not found', {
          email,
          type,
        });

        this.traceService.addCurrentEvent('User not found');

        throw new BadRequestException('Invalid email');
      }

      this.traceService.setCurrentAttributes({
        'user.id': user.id,
        'user.role': user.role,
      });

      this.traceService.addCurrentEvent('User found');

      if (type === 'VERIFY_EMAIL' && user.isEmailVerified) {
        this.logger.warn('OTP resend failed - email already verified', {
          userId: user.id,
          email: user.email,
        });

        this.traceService.addCurrentEvent(
          'Email already verified',
        );

        throw new BadRequestException('Email already verified');
      }

      const otp = await this.issueOtp(user, type as OtpType);

      this.traceService.addCurrentEvent(
        'New OTP stored',
      );

      const companyLogo = 'https://i.imgur.com/3KcynwC.png';

      const subject =
        type === 'VERIFY_EMAIL' ? 'Verify your email' : 'Reset password OTP';

      const message = `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <!-- Header with logo -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${companyLogo}" alt="Company Logo" style="width: 120px; height: auto;" />
          </div>

          <!-- Greeting -->
          <p style="font-size: 16px;">Hi <strong>${user.name}</strong>,</p>

          <!-- Main message -->
          <h2 style="font-size: 16px;">
            Your OTP is: "<strong>${otp}</strong>"
          </h2>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            This email was sent by <strong>Job Seeker Pvt. Ltd.</strong>. Please do not reply directly to this email.
          </p>
        </div>
      `;

      await this.mailService.sendMail(user.email, subject, message, message);
      this.prometheusService.otpSent.labels('otp_resent').inc();
      this.traceService.addCurrentEvent(
        'OTP email sent',
      );

      this.logger.info('OTP resent successfully', {
        userId: user.id,
        email: user.email,
        type,
      });

      return {
        message: `OTP has been sent to your email: ${user.email}`,
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'OTP resend failed',
        error,
        {
          email,
          type,
        },
      );

      throw error;
    }

  }

  /**
   *! Reset Password
   */
  @Trace('authv2.reset-password')
  async resetPassword(
    email: string,
    newPassword: string,
    otp: string,
  ): Promise<{ message: string }> {
    this.logger.info('Password reset requested', {
      email,
    });

    this.traceService.setCurrentAttributes({
      'auth.email': email,
    });

    try {
      const user = await this.UserModel.findOne({ email });
      if (!user) {
        this.logger.warn('Password reset failed - user not found', {
          email,
        });

        this.traceService.addCurrentEvent(
          'User not found',
        );

        throw new UnauthorizedException();
      }

      this.traceService.setCurrentAttributes({
        'user.id': user.id,
        'user.role': user.role,
      });

      this.traceService.addCurrentEvent(
        'User found',
      );

      await this.validateOtp(
        user,
        otp,
        OtpType.FORGOT_PASSWORD,
      );

      user.password = await bcrypt.hash(newPassword, 10);
      this.traceService.addCurrentEvent(
        'Password hashed',
      );
      user.refreshToken = '';
      this.traceService.addCurrentEvent(
        'Refresh token invalidated',
      );

      await user.save();
      this.traceService.addCurrentEvent(
        'User password updated',
      );

      this.logger.info('Password reset completed successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        message: 'Password reset successfully!',
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Password reset failed',
        error,
        {
          email,
        },
      );

      throw error;
    }

  }

  /**
   *! Logout User
   */
  @Trace('authv2.logout')
  async logout(userId: string): Promise<void> {

    this.logger.info('Logout requested', { userId });

    this.traceService.setCurrentAttributes({ 'user.id': userId })

    try {
      const result = await this.UserModel.updateOne(
        { _id: userId },
        {
          $set: {
            refreshToken: null,
          },
        },
      );

      if (result.matchedCount === 0) {
        this.logger.warn('Logout failed - user not found', {
          userId,
        });

        this.traceService.addCurrentEvent(
          'User not found',
        );

        throw new NotFoundException('User not found');
      }

      this.traceService.addCurrentEvent(
        'Refresh token invalidated',
      );

      this.logger.info('User logged out successfully', {
        userId,
      });
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Logout failed',
        error,
        {
          userId,
        },
      );

      throw error;
    }
  }
}
