import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { generateOtp, hashOtp, otpExpiry } from '../../common/utils/otp.util';
import { Otp } from './schemas/otp.schema';
import { MailService } from '../mail/mail.service';
import { VerifyEmailDto } from './dto/verifyEmail.dto';
import ms from 'ms';
import { LoggerService } from '../../common/logger/logger.service';

type OtpType = 'VERIFY_EMAIL' | 'FORGOT_PASSWORD';
/**
 *! Auth Service
 */
@Injectable()
export class AuthV2Service {
  private readonly SALT_ROUNDS = 10;

  //! Dependency Injection
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    @InjectModel(Otp.name) private otpModel: Model<Otp>,
    private jwtService: JwtService,
    private usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(AuthV2Service.name);
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
  async refreshTokens(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync(refreshToken);

    const user = await this.UserModel.findById(payload.sub).select('-password');

    if (!user || !user.refreshToken)
      throw new UnauthorizedException("Refresh Token doesn't exist");

    const matches = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!matches) throw new ForbiddenException('Refresh Token doesnot match ');

    const remainingMs = user.refreshTokenExpiresAt.getTime() - Date.now();
    if (remainingMs <= 0)
      throw new UnauthorizedException('Refresh token expired');

    const tokens = await this.generateTokens(
      user._id,
      user.email,
      user.role,
      undefined,
      Math.floor(remainingMs / 1000),
    );

    await this.updateRefreshToken(
      user.id,
      tokens.refreshToken,
      user.refreshTokenExpiresAt,
    );

    return {
      accessToken: tokens.accessToken,
      newRefreshToken: tokens.refreshToken,
      user: this.buildResponse(user),
      remainingMs,
    };
  }

  /**
   *! Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { name, email, password, role } = registerDto;

    this.logger.info('User registration requested', {
      email,
      role,
    });

    const emailInUse = await this.usersService.findByEmail(email);
    if (emailInUse) {
      this.logger.warn('Registration failed - email already exists', {
        email,
      });
      throw new BadRequestException('User with this email already exists');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      const user = await this.UserModel.create({
        name,
        email,
        password: hashedPassword,
        role,
        isEmailVerified: false,
        // avatar,
        // avatarPublicId,
      });

      this.logger.info('User account created', {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      // Generate OTP
      const otp = generateOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);

      // Save OTP in otpModel
      await this.otpModel.create({
        otp: hashedOtp,
        expiresAt: otpExpiry(this.configService.get('OTP_EXPIRY_TIME')), // e.g., 10 minutes
        userId: user._id,
        type: 'VERIFY_EMAIL',
      });

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

      this.logger.info('Verification email sent', {
        userId: user._id.toString(),
        email: user.email,
      });

      this.logger.info('User registration completed successfully', {
        userId: user._id.toString(),
      });

      return { message: `Verify Otp sent to your email: ${user.email}` };
    } catch (error) {
      // console.error('Error during user registration:', error);
      this.logger.error('User registration failed', error, {
        email,
        role,
      });
      throw new InternalServerErrorException(
        'An error occured during registration',
      );
    }
  }

  /**
   *! Verify Email
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const { email, otp } = dto;

    this.logger.info('Email verification requested', {
      email,
    });

    try {
      // Find the user
      const user = await this.UserModel.findOne({ email });
      if (!user) {
        this.logger.warn('Email verification failed - user not found', {
          email,
        });
        throw new BadRequestException('Invalid email');
      }

      if (user.isEmailVerified) {
        this.logger.warn('Email verification skipped - already verified', {
          userId: user.id,
          email: user.email,
        });
        throw new BadRequestException('Email already verified');
      }

      // Find the latest verification OTP from otpModel
      const otpRecord = await this.otpModel.findOne({
        userId: user._id,
        type: 'VERIFY_EMAIL',
      });

      if (!otpRecord) {
        this.logger.warn('Email verification failed - OTP not found', {
          userId: user.id,
          email: user.email,
        });
        throw new BadRequestException('OTP not found');
      }

      if (otpRecord.expiresAt < new Date()) {
        // Optionally delete expired OTP
        await this.otpModel.deleteOne({ _id: otpRecord._id });

        this.logger.warn('Email verification failed - OTP expired', {
          userId: user.id,
          email: user.email,
        });

        throw new BadRequestException('OTP expired');
      }

      // Compare OTP
      const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);

      if (!isOtpValid) {
        this.logger.warn('Email verification failed - invalid OTP', {
          userId: user.id,
          email: user.email,
        });
        throw new BadRequestException('Invalid OTP');
      }

      // OTP is valid, mark user as verified
      user.isEmailVerified = true;
      await user.save();

      this.logger.info('User email verified', {
        userId: user.id,
        email: user.email,
      });

      // Delete OTP after successful verification
      await this.otpModel.deleteOne({ _id: otpRecord._id });

      // Generate access & refresh tokens
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        false, // rememberMe
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

      this.logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      return { message: 'Email verified successfully. You can now login.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Email verification failed', error, {
        email,
      });

      throw new InternalServerErrorException(
        'An error occurred while verifying email.',
      );
    }
  }

  /**
   *! Login User
   */
  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;

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

    if (
      !user ||
      !(await bcrypt.compare(password.trim(), user.password.trim()))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      rememberMe,
    );
    await this.updateRefreshToken(
      user.id,
      tokens.refreshToken,
      refreshExpiresAt,
    );

    this.logger.info('User logged in', {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.buildResponse(user),
    };
  }

  /**
   *! Forgot password
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.UserModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not Found');
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Invalidate previous forgot password OTPs
    await this.otpModel.deleteMany({
      userId: user._id,
      type: 'FORGOT_PASSWORD',
    });

    await this.otpModel.create({
      otp: hashedOtp,
      expiresAt: otpExpiry(this.configService.get('OTP_EXPIRY_TIME')), // Expires in 10 mins
      userId: user._id,
      type: 'FORGOT_PASSWORD',
    });

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

    return { message: `OTP has been sent to your email: ${user.email}` };
  }

  /**
   *! Verify Otp
   */
  async verifyOtp(
    email: string,
    otp: string,
    type: 'VERIFY_EMAIL' | 'FORGOT_PASSWORD',
  ): Promise<boolean> {
    const user = await this.UserModel.findOne({ email });
    if (!user) throw new UnauthorizedException();

    const otpRecord = await this.otpModel.findOne({ userId: user._id, type });
    if (!otpRecord) throw new UnauthorizedException('OTP expired');

    if (otpRecord.expiresAt < new Date()) {
      await this.otpModel.deleteOne({ _id: otpRecord._id });
      throw new UnauthorizedException('OTP expired');
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) throw new UnauthorizedException('Invalid OTP');

    await this.otpModel.deleteOne({ _id: otpRecord._id });

    return true;
  }

  /**
   *! Resend Otp
   */
  async resendOtp(
    email: string,
    type: 'VERIFY_EMAIL' | 'FORGOT_PASSWORD',
  ): Promise<{ message: string }> {
    const user = await this.UserModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('Invalid email');
    }

    if (type === 'VERIFY_EMAIL' && user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Invalidate previous verification OTPs
    await this.otpModel.deleteMany({ userId: user._id, type });

    await this.otpModel.create({
      otp: hashedOtp,
      expiresAt: otpExpiry(this.configService.get('OTP_EXPIRY_TIME')), // e.g., 10 minutes
      userId: user._id,
      type,
    });

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

    return { message: `OTP has been sent to your email: ${user.email}` };
  }

  /**
   *! Reset Password
   */
  async resetPassword(
    email: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.UserModel.findOne({ email });
    if (!user) throw new UnauthorizedException();

    user.password = await bcrypt.hash(newPassword, 10);
    user.refreshToken = '';

    await user.save();
    await this.otpModel.deleteMany({ userId: user._id });

    return {
      message: 'Password reset successfully!',
    };
  }

  /**
   *! Logout User
   */
  async logout(userId: string): Promise<void> {
    await this.UserModel.updateOne(
      { _id: userId },
      { $set: { refreshToken: null } },
    );
  }
}
