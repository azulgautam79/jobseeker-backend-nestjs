import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AuthV2Service } from './authv2.service';
import { User } from '../users/schemas/user.schema';
import { Otp } from './schemas/otp.schema';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthV2Service', () => {
  let service: AuthV2Service;

  const userModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
  };

  const otpModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const usersService = {
    findByEmail: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'ACCESS_TOKEN_TIME':
          return '15m';
        case 'REFRESH_TOKEN_TIME':
          return '1d';
        case 'REFRESH_TOKEN_REMEMBER_TIME':
          return '7d';
        case 'OTP_EXPIRY_TIME':
          return 10;
      }
    }),
    getOrThrow: jest.fn((key: string) => {
      switch (key) {
        case 'REFRESH_TOKEN_TIME':
          return '1d';
        case 'REFRESH_TOKEN_REMEMBER_TIME':
          return '7d';
      }
    }),
  };

  const mailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthV2Service,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(Otp.name),
          useValue: otpModel,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    service = module.get(AuthV2Service);
  });

  describe('updateRefreshToken', () => {
    it('should hash and save refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

      await service.updateRefreshToken('userId', 'refresh-token', new Date());

      expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token', 10);

      expect(userModel.updateOne).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should throw if refresh token does not exist', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'userId',
      });

      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.refreshTokens('refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if refresh token does not match', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'userId',
      });

      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          refreshToken: 'hashed',
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('refresh-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if refresh token expired', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'userId',
      });

      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'userId',
          id: 'userId',
          email: 'john@test.com',
          role: 'JOBSEEKER',
          refreshToken: 'hashed',
          refreshTokenExpiresAt: new Date(Date.now() - 5000),
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.refreshTokens('refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should refresh tokens successfully', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000);

      jwtService.verifyAsync.mockResolvedValue({
        sub: 'userId',
      });

      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'userId',
          id: 'userId',
          name: 'John',
          email: 'john@test.com',
          avatar: '',
          role: 'JOBSEEKER',
          refreshToken: 'hashed',
          refreshTokenExpiresAt: future,
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'generateTokens').mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue();

      const result = await service.refreshTokens('refresh-token');

      expect(result.accessToken).toBe('access');
      expect(result.newRefreshToken).toBe('refresh');

      expect(service.updateRefreshToken).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const dto = {
      name: 'John',
      email: 'john@test.com',
      password: 'password',
      avatar: '',
      role: 'JOBSEEKER',
    };

    it('should throw if email already exists', async () => {
      usersService.findByEmail.mockResolvedValue({
        email: dto.email,
      });

      await expect(service.register(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should register successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce('hashed-password')
        .mockResolvedValueOnce('hashed-otp');

      userModel.create.mockResolvedValue({
        _id: 'userId',
        name: dto.name,
        email: dto.email,
      });

      otpModel.create.mockResolvedValue({});

      mailService.sendMail.mockResolvedValue(undefined);

      const result = await service.register(dto as any);

      expect(userModel.create).toHaveBeenCalled();

      expect(otpModel.create).toHaveBeenCalled();

      expect(mailService.sendMail).toHaveBeenCalled();

      expect(result).toEqual({
        message: `Verify Otp sent to your email: ${dto.email}`,
      });
    });

    it('should throw InternalServerErrorException when create fails', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      userModel.create.mockRejectedValue(new Error('database error'));

      await expect(service.register(dto as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('verifyEmail', () => {
    const dto = {
      email: 'john@test.com',
      otp: '123456',
    };

    it('should throw if user does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if email already verified', async () => {
      userModel.findOne.mockResolvedValue({
        isEmailVerified: true,
      });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if otp not found', async () => {
      userModel.findOne.mockResolvedValue({
        _id: 'userId',
        isEmailVerified: false,
      });

      otpModel.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if otp expired', async () => {
      userModel.findOne.mockResolvedValue({
        _id: 'userId',
        isEmailVerified: false,
      });

      otpModel.findOne.mockResolvedValue({
        _id: 'otpId',
        expiresAt: new Date(Date.now() - 10000),
      });

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(otpModel.deleteOne).toHaveBeenCalled();
    });

    it('should throw if otp is invalid', async () => {
      userModel.findOne.mockResolvedValue({
        _id: 'userId',
        isEmailVerified: false,
      });

      otpModel.findOne.mockResolvedValue({
        _id: 'otpId',
        otp: 'hashedOtp',
        expiresAt: new Date(Date.now() + 60000),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should verify email successfully', async () => {
      const save = jest.fn();

      const user = {
        _id: 'userId',
        id: 'userId',
        email: dto.email,
        role: 'JOBSEEKER',
        name: 'John',
        avatar: '',
        isEmailVerified: false,
        save,
      };

      userModel.findOne.mockResolvedValue(user);

      otpModel.findOne.mockResolvedValue({
        _id: 'otpId',
        otp: 'hashedOtp',
        expiresAt: new Date(Date.now() + 60000),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'generateTokens').mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue();

      const result = await service.verifyEmail(dto);

      expect(save).toHaveBeenCalled();

      expect(otpModel.deleteOne).toHaveBeenCalled();

      expect(service.updateRefreshToken).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Email verified successfully. You can now login.',
      });
    });
  });

  describe('login', () => {
    const dto = {
      email: 'john@test.com',
      password: 'password',
      rememberMe: false,
    };

    it('should throw if user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue({
        password: 'hashed',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if email is not verified', async () => {
      usersService.findByEmail.mockResolvedValue({
        password: 'hashed',
        isEmailVerified: false,
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully', async () => {
      const user = {
        _id: 'userId',
        id: 'userId',
        name: 'John',
        email: dto.email,
        password: 'hashed',
        avatar: '',
        role: 'JOBSEEKER',
        isEmailVerified: true,
        companyName: '',
        companyDescription: '',
        companyLogo: '',
        resume: '',
      };

      usersService.findByEmail.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'generateTokens').mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue();

      const result = await service.login(dto);

      expect(service.updateRefreshToken).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          rememberMe: undefined,
          companyName: '',
          companyDescription: '',
          companyLogo: '',
          resume: '',
        },
      });
    });

    it('should login successfully with rememberMe=true', async () => {
      const user = {
        _id: 'userId',
        id: 'userId',
        name: 'John',
        email: dto.email,
        password: 'hashed',
        avatar: '',
        role: 'JOBSEEKER',
        isEmailVerified: true,
        companyName: '',
        companyDescription: '',
        companyLogo: '',
        resume: '',
      };

      usersService.findByEmail.mockResolvedValue(user);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service as any, 'generateTokens').mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue();

      const result = await service.login({
        ...dto,
        rememberMe: true,
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(service.updateRefreshToken).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should throw if user not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.forgotPassword('john@test.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should send forgot password otp', async () => {
      const user = {
        _id: 'userId',
        name: 'John',
        email: 'john@test.com',
      };

      userModel.findOne.mockResolvedValue(user);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-otp');

      otpModel.deleteMany.mockResolvedValue({});
      otpModel.create.mockResolvedValue({});
      mailService.sendMail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(user.email);

      expect(otpModel.deleteMany).toHaveBeenCalledWith({
        userId: user._id,
        type: 'FORGOT_PASSWORD',
      });

      expect(otpModel.create).toHaveBeenCalled();

      expect(mailService.sendMail).toHaveBeenCalled();

      expect(result).toEqual({
        message: `OTP has been sent to your email: ${user.email}`,
      });
    });
  });

  describe('verifyOtp', () => {
    const email = 'john@test.com';
    const otp = '123456';

    it('should throw if user not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.verifyOtp(email, otp, 'VERIFY_EMAIL'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if otp record not found', async () => {
      userModel.findOne.mockResolvedValue({
        _id: 'userId',
      });

      otpModel.findOne.mockResolvedValue(null);

      await expect(
        service.verifyOtp(email, otp, 'VERIFY_EMAIL'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if otp expired', async () => {
      userModel.findOne.mockResolvedValue({
        _id: 'userId',
      });

      otpModel.findOne.mockResolvedValue({
        _id: 'otpId',
        expiresAt: new Date(Date.now() - 5000),
      });

      await expect(
        service.verifyOtp(email, otp, 'VERIFY_EMAIL'),
      ).rejects.toThrow(UnauthorizedException);

      expect(otpModel.deleteOne).toHaveBeenCalledWith({
        _id: 'otpId',
      });
    });

    it('should throw if otp is invalid', async () => {
      userModel.findOne.mockResolvedValue({
        _id: 'userId',
      });

      otpModel.findOne.mockResolvedValue({
        _id: 'otpId',
        otp: 'hashedOtp',
        expiresAt: new Date(Date.now() + 5000),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyOtp(email, otp, 'VERIFY_EMAIL'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should verify otp successfully', async () => {
      userModel.findOne.mockResolvedValue({
        _id: 'userId',
      });

      otpModel.findOne.mockResolvedValue({
        _id: 'otpId',
        otp: 'hashedOtp',
        expiresAt: new Date(Date.now() + 60000),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      otpModel.deleteOne.mockResolvedValue({});

      const result = await service.verifyOtp(email, otp, 'VERIFY_EMAIL');

      expect(result).toBe(true);

      expect(otpModel.deleteOne).toHaveBeenCalledWith({
        _id: 'otpId',
      });
    });
  });

  describe('resendOtp', () => {
    it('should throw if user not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.resendOtp('john@test.com', 'VERIFY_EMAIL'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if email already verified', async () => {
      userModel.findOne.mockResolvedValue({
        isEmailVerified: true,
      });

      await expect(
        service.resendOtp('john@test.com', 'VERIFY_EMAIL'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should resend verification otp', async () => {
      const user = {
        _id: 'userId',
        name: 'John',
        email: 'john@test.com',
        isEmailVerified: false,
      };

      userModel.findOne.mockResolvedValue(user);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedOtp');

      otpModel.deleteMany.mockResolvedValue({});
      otpModel.create.mockResolvedValue({});
      mailService.sendMail.mockResolvedValue(undefined);

      const result = await service.resendOtp(user.email, 'VERIFY_EMAIL');

      expect(otpModel.deleteMany).toHaveBeenCalledWith({
        userId: user._id,
        type: 'VERIFY_EMAIL',
      });

      expect(otpModel.create).toHaveBeenCalled();

      expect(mailService.sendMail).toHaveBeenCalled();

      expect(result).toEqual({
        message: `OTP has been sent to your email: ${user.email}`,
      });
    });

    it('should resend forgot password otp', async () => {
      const user = {
        _id: 'userId',
        name: 'John',
        email: 'john@test.com',
        isEmailVerified: true,
      };

      userModel.findOne.mockResolvedValue(user);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedOtp');

      otpModel.deleteMany.mockResolvedValue({});
      otpModel.create.mockResolvedValue({});
      mailService.sendMail.mockResolvedValue(undefined);

      const result = await service.resendOtp(user.email, 'FORGOT_PASSWORD');

      expect(otpModel.deleteMany).toHaveBeenCalledWith({
        userId: user._id,
        type: 'FORGOT_PASSWORD',
      });

      expect(mailService.sendMail).toHaveBeenCalled();

      expect(result).toEqual({
        message: `OTP has been sent to your email: ${user.email}`,
      });
    });
  });

  describe('resetPassword', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('john@test.com', 'newPassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reset password successfully', async () => {
      const save = jest.fn();

      const user = {
        _id: 'userId',
        email: 'john@test.com',
        password: 'old-password',
        refreshToken: 'refresh-token',
        save,
      };

      userModel.findOne.mockResolvedValue(user);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      otpModel.deleteMany.mockResolvedValue({});

      const result = await service.resetPassword(
        'john@test.com',
        'newPassword123',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);

      expect(user.password).toBe('hashed-password');
      expect(user.refreshToken).toBe('');

      expect(save).toHaveBeenCalled();

      expect(otpModel.deleteMany).toHaveBeenCalledWith({
        userId: user._id,
      });

      expect(result).toEqual({
        message: 'Password reset successfully!',
      });
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      userModel.updateOne.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 1,
      });

      await service.logout('userId');

      expect(userModel.updateOne).toHaveBeenCalledWith(
        {
          _id: 'userId',
        },
        {
          $set: {
            refreshToken: null,
          },
        },
      );
    });
  });
});
