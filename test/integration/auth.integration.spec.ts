import * as bcrypt from 'bcrypt';

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { AuthV2Service } from '../../src/modules/auth/authv2.service';

import { User } from '../../src/modules/users/schemas/user.schema';
import { Otp } from '../../src/modules/auth/schemas/otp.schema';

import { MailService } from '../../src/modules/mail/mail.service';

import { Role } from '../../src/common/enums/role';

import { createIntegrationApp } from '../helpers/integration-app';
import { clearDatabase, closeDatabase } from '../helpers/database';
import { disconnectMongo } from '../helpers/mongodb-memory';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

let connection: Connection;

describe('Auth Integration', () => {
  let app: INestApplication;
  let module: TestingModule;

  let authService: AuthV2Service;

  let userModel;
  let otpModel;
  let connection: Connection;

  let mailService: MailService;

  beforeAll(async () => {
    ({ app, module } = await createIntegrationApp([AuthModule]));
    connection = module.get<Connection>(getConnectionToken());

    authService = module.get(AuthV2Service);

    mailService = module.get(MailService);

    userModel = module.get(getModelToken(User.name));

    otpModel = module.get(getModelToken(Otp.name));
  });

  afterEach(async () => {
    jest.clearAllMocks();

    await clearDatabase(connection);
  });

  afterAll(async () => {
    await app.close();

    await closeDatabase(connection);

    await disconnectMongo();
  });

  describe('register()', () => {
    //! Register a new user
    it('should register a new user', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password@123',
        role: Role.JOBSEEKER,
      };

      const result = await authService.register(dto);

      expect(result).toBeDefined();

      expect(result).toEqual({
        message: `Verify Otp sent to your email: ${dto.email}`,
      });

      //------------------------------------
      // User saved in database
      //------------------------------------

      const user = await userModel.findOne({
        email: dto.email,
      });

      expect(user).not.toBeNull();

      expect(user.name).toBe(dto.name);

      expect(user.email).toBe(dto.email);

      //------------------------------------
      // Password hashed
      //------------------------------------

      expect(user.password).not.toBe(dto.password);

      const matches = await bcrypt.compare(dto.password, user.password);

      expect(matches).toBe(true);

      //------------------------------------
      // OTP created
      //------------------------------------

      const otp = await otpModel.findOne({
        userId: user._id,
      });

      expect(otp).not.toBeNull();
      expect(otp.type).toBe('VERIFY_EMAIL');

      //------------------------------------
      // Email sent
      //------------------------------------

      expect(mailService.sendMail).toHaveBeenCalledTimes(1);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        dto.email,
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });

    //! Throw if already exists
    it('should throw if email already exists', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password@123',
        role: Role.JOBSEEKER,
      };

      await authService.register(dto);

      try {
        await authService.register(dto);
        fail('Expected register() to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);

        if (error instanceof BadRequestException) {
          expect(error.message).toBe('User with this email already exists');
        }
      }
    });
  });
});
