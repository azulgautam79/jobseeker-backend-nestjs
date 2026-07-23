import * as fs from 'fs';
import * as path from 'path';

import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { UsersModule } from '../../src/modules/users/users.module';
import { UsersService } from '../../src/modules/users/users.service';

import { User } from '../../src/modules/users/schemas/user.schema';

import { Role } from '../../src/common/enums/role';

import { createIntegrationApp } from '../helpers/integration-app';

import { clearDatabase, closeDatabase } from '../helpers/database';

import { disconnectMongo } from '../helpers/mongodb-memory';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import {
  createEmployer,
  createJobSeeker,
} from '../helpers/factories/user.factory';

describe('Users Integration', () => {
  let app: INestApplication;

  let module: TestingModule;

  let service: UsersService;
  let connection: Connection;

  let userModel;

  beforeAll(async () => {
    ({ app, module } = await createIntegrationApp([UsersModule]));

    connection = module.get<Connection>(getConnectionToken());

    service = module.get(UsersService);

    userModel = module.get(getModelToken(User.name));
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    await clearDatabase(connection);
  });

  afterAll(async () => {
    await app.close();

    await closeDatabase(connection);

    await disconnectMongo();
  });

  describe('create()', () => {
    it('should create a user', async () => {
      const user = await service.create({
        name: 'John',
        email: 'john@test.com',
        password: 'password',
        role: Role.JOBSEEKER,
      });

      expect(user).toBeDefined();

      const dbUser = await userModel.findOne({
        email: 'john@test.com',
      });

      expect(dbUser).not.toBeNull();

      expect(dbUser.name).toBe('John');
    });
  });

  describe('findAll()', () => {
    it('should return empty array', async () => {
      const users = await service.findAll();

      expect(users).toEqual([]);
    });

    it('should return all users', async () => {
      await createEmployer(userModel);

      await createJobSeeker(userModel);

      const users = await service.findAll();

      expect(users).toHaveLength(2);
    });
  });

  describe('findByEmail()', () => {
    it('should find user by email', async () => {
      const created = await createJobSeeker(userModel);
      const user = await service.findByEmail(created.email);

      expect(user).not.toBeNull();

      expect(user!.email).toBe(created.email);
      expect(user!.name).toBe(created.name);
    });

    it('should return null', async () => {
      const user = await service.findByEmail('unknown@test.com');

      expect(user).toBeNull();
    });
  });

  describe('findOne()', () => {
    it('should find user', async () => {
      const created = await createJobSeeker(userModel);

      const user = await service.findOne(created._id.toString());

      expect(user).not.toBeNull();
      expect(user?._id.toString()).toBe(created._id.toString());
    });

    it('should return null for invalid id', async () => {
      const user = await service.findOne('685fc37ea26ebc75c37b9f31');

      expect(user).toBeNull();
    });
  });

  describe('updateProfile()', () => {
    it('should update jobseeker profile', async () => {
      const user = await createJobSeeker(userModel);

      const result = await service.updateProfie(user._id.toString(), {
        name: 'Updated',
        avatar: 'avatar.jpg',
        resume: 'resume.pdf',
      });

      expect(result.name).toBe('Updated');
    });

    it('should update employer profile', async () => {
      const employer = await createEmployer(userModel);

      const result = await service.updateProfie(employer._id.toString(), {
        companyName: 'OpenAI',

        companyDescription: 'AI Company',

        companyLogo: 'logo.png',
      });

      expect(result.companyName).toBe('OpenAI');

      expect(result.companyLogo).toBe('logo.png');
    });

    it('should throw if user not found', async () => {
      await expect(
        service.updateProfie('685fc37ea26ebc75c37b9f31', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteResume()', () => {
    const uploadsDir = path.join(process.cwd(), 'uploads');

    beforeEach(() => {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    });

    afterEach(() => {
      const filePath = path.join(uploadsDir, 'resume.pdf');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    it('should delete resume', async () => {
      const user = await createJobSeeker(userModel);

      const fileName = 'resume.pdf';
      const filePath = path.join(uploadsDir, fileName);

      // create a real file
      fs.writeFileSync(filePath, 'dummy resume');

      user.resume = `http://localhost/uploads/${fileName}`;
      await user.save();

      const result = await service.deleteResume(user._id.toString(), {
        resumeUrl: user.resume,
      });

      expect(result.message).toBe('Resume deleted successfully');

      expect(fs.existsSync(filePath)).toBe(false);

      const updated = await userModel.findById(user._id);

      expect(updated.resume).toBe('');
    });

    it('should throw if employer deletes resume', async () => {
      const employer = await createEmployer(userModel);

      await expect(
        service.deleteResume(employer._id.toString(), {
          resumeUrl: 'resume.pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if user not found', async () => {
      await expect(
        service.deleteResume('685fc37ea26ebc75c37b9f31', {
          resumeUrl: 'resume.pdf',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicProfile()', () => {
    it('should return public profile', async () => {
      const user = await createJobSeeker(userModel);

      const profile = await service.getPublicProfile(user._id.toString());

      expect(profile.email).toBe(user.email);
    });

    it('should throw if user not found', async () => {
      await expect(
        service.getPublicProfile('685fc37ea26ebc75c37b9f31'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
