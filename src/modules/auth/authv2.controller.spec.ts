import { Test, TestingModule } from '@nestjs/testing';
import { AuthV2Controller } from './authv2.controller';
import { AuthV2Service } from './authv2.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { OtpType } from '../../common/enums/otpType';

describe('AuthV2Controller', () => {
  let controller: AuthV2Controller;
  let service: AuthV2Service;
  let configService: ConfigService;

  const mockAuthService = {
    register: jest.fn(),
    verifyEmail: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    forgotPassword: jest.fn(),
    verifyOtp: jest.fn(),
    resendOtp: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
    uploadAvatar: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockUsersService = {};

  const mockJwtService = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthV2Controller],
      providers: [
        {
          provide: AuthV2Service,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get(AuthV2Controller);
    service = module.get(AuthV2Service);
    configService = module.get(ConfigService);
  });

  //! Should exist
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //! Register a user
  describe('register', () => {
    it('should register user', async () => {
      const dto = {
        email: 'john@gmail.com',
        password: '123456',
      };

      const response = {
        message: 'User registered successfully',
      };

      mockAuthService.register.mockResolvedValue(response);

      const result = await controller.register(dto as any);

      expect(service.register).toHaveBeenCalledWith(dto);

      expect(result).toEqual(response);
    });
  });

  //! Verify the email
  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const dto = {
        email: 'john@gmail.com',
        otp: '123456',
      };

      const response = {
        message: 'Email verified',
      };

      mockAuthService.verifyEmail.mockResolvedValue(response);

      const result = await controller.verifyEmail(dto as any);

      expect(service.verifyEmail).toHaveBeenCalledWith(dto);

      expect(result).toEqual(response);
    });
  });

  //! Login
  describe('login', () => {
    it('should login user and set refresh cookie', async () => {
      const dto = {
        email: 'john@gmail.com',
        password: '123456',
        rememberMe: false,
      };

      const res = {
        cookie: jest.fn(),
      };

      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: '1',
        },
      });

      mockConfigService.getOrThrow.mockReturnValue('7d');

      mockConfigService.get.mockReturnValue('development');

      const result = await controller.login(dto as any, res as any);

      expect(service.login).toHaveBeenCalledWith(dto);

      expect(res.cookie).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'access-token',
        user: {
          id: '1',
        },
      });
    });
  });

  //! Refresh the access token
  describe('refresh', () => {
    it('should refresh access token', async () => {
      const req = {
        cookies: {
          refreshToken: 'refresh-token',
        },
      };

      const res = {
        cookie: jest.fn(),
      };

      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access',
        newRefreshToken: 'new-refresh',
        remainingMs: 1000,
        user: {
          id: '1',
        },
      });

      mockConfigService.get.mockReturnValue('development');

      const result = await controller.refresh(req as any, res as any);

      expect(service.refreshTokens).toHaveBeenCalledWith('refresh-token');

      expect(res.cookie).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'new-access',
        user: {
          id: '1',
        },
      });
    });

    //! If access token missing throw error
    it('should throw if refresh token is missing', async () => {
      const req = {
        cookies: {},
      };

      const res = {
        cookie: jest.fn(),
      };

      await expect(controller.refresh(req as any, res as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  //! Forgot Password
  describe('forgotPassword', () => {
    it('should send forgot password OTP', async () => {
      const dto = {
        email: 'john@gmail.com',
      };

      const response = {
        success: true,
        message: 'OTP sent successfully',
      };

      mockAuthService.forgotPassword.mockResolvedValue(response);

      const result = await controller.forgotPassword(dto as any);

      expect(service.forgotPassword).toHaveBeenCalledWith(dto.email);

      expect(result).toEqual(response);
    });
  });

  //! Verify ForgotPassword Otp
  describe('verifyOtp', () => {
    it('should verify forgot password OTP', async () => {
      const dto = {
        email: 'john@gmail.com',
        otp: '123456',
        type: OtpType.FORGOT_PASSWORD,
      };

      const response = {
        success: true,
        message: 'OTP verified successfully',
      };

      mockAuthService.verifyOtp.mockResolvedValue(response);

      const result = await controller.verifyOtp(dto);

      expect(service.verifyOtp).toHaveBeenCalledWith(
        dto.email,
        dto.otp,
        dto.type,
      );

      expect(result).toEqual(response);
    });
  });

  //! Resend Verify Otp
  describe('resendVerifyOtp', () => {
    it('should resend email verification OTP', async () => {
      const dto = {
        email: 'john@gmail.com',
      };

      const response = {
        success: true,
        message: 'Verification OTP resent',
      };

      mockAuthService.resendOtp.mockResolvedValue(response);

      const result = await controller.resendVerifyOtp(dto as any);

      expect(service.resendOtp).toHaveBeenCalledWith(dto.email, 'VERIFY_EMAIL');

      expect(result).toEqual(response);
    });
  });

  //! Resend Forgot Password Otp
  describe('resendForgotOtp', () => {
    it('should resend forgot password OTP', async () => {
      const dto = {
        email: 'john@gmail.com',
      };

      const response = {
        success: true,
        message: 'Forgot password OTP resent',
      };

      mockAuthService.resendOtp.mockResolvedValue(response);

      const result = await controller.resendForgotOtp(dto);

      expect(service.resendOtp).toHaveBeenCalledWith(
        dto.email,
        'FORGOT_PASSWORD',
      );

      expect(result).toEqual(response);
    });
  });

  //! Resets the password
  describe('resetPassword', () => {
    it('should reset password', async () => {
      const dto = {
        email: 'john@gmail.com',
        newPassword: 'newpassword123',
      };

      const response = {
        success: true,
        message: 'Password reset successfully',
      };

      mockAuthService.resetPassword.mockResolvedValue(response);

      const result = await controller.resetPassword(dto as any);

      expect(service.resetPassword).toHaveBeenCalledWith(
        dto.email,
        dto.newPassword,
      );

      expect(result).toEqual(response);
    });
  });

  //! Logout
  describe('logout', () => {
    it('should logout user and clear refresh cookie', async () => {
      const response = {
        success: true,
        message: 'Logged out successfully',
      };

      mockAuthService.logout.mockResolvedValue(response);

      const result = await controller.logout('user-id');

      expect(service.logout).toHaveBeenCalledWith('user-id');

      expect(result).toEqual({
        message: 'Successfully logged out',
      });
    });
  });

  //! Get Current User
  describe('getMe', () => {
    it('should return current user', async () => {
      const req = {
        user: {
          _id: '1',
          name: 'John Doe',
          email: 'john@gmail.com',
        },
      };

      const result = await controller.getMe(req as any);

      expect(result).toEqual(req.user);
    });
  });

  //! Upload an avatar
  describe('uploadImage', () => {
    it('should return uploaded image url', () => {
      const file = {
        filename: 'avatar.png',
      };

      const req = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:7000'),
      };

      const result = controller.uploadImage(file as any, req as any);

      expect(req.get).toHaveBeenCalledWith('host');

      expect(result).toEqual({
        imageUrl: 'http://localhost:7000/uploads/avatar.png',
      });
    });

    it('should throw if no file is uploaded', () => {
      const req = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:7000'),
      };

      expect(() =>
        controller.uploadImage(undefined as any, req as any),
      ).toThrow(BadRequestException);
    });
  });
});
