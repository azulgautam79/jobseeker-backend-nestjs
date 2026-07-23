import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import * as fs from 'fs';

import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Role } from '../../common/enums/role';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const userModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = {
        name: 'John',
        email: 'john@test.com',
      };

      userModel.create.mockResolvedValue(dto);

      const result = await service.create(dto);

      expect(userModel.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(dto);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [{ name: 'John' }, { name: 'Jane' }];

      userModel.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const user = {
        email: 'john@test.com',
      };

      userModel.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('john@test.com');

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'john@test.com',
      });

      expect(result).toEqual(user);
    });
  });

  describe('findOne', () => {
    it('should return user without password', async () => {
      const user = {
        name: 'John',
      };

      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const result = await service.findOne('userId');

      expect(result).toEqual(user);
    });
  });

  describe('updateProfie', () => {
    it('should throw if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.updateProfie('id', {
          name: 'John',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update JOBSEEKER profile', async () => {
      const save = jest.fn();

      const user = {
        _id: new Types.ObjectId(),
        name: 'Old Name',
        avatar: '',
        resume: '',
        role: Role.JOBSEEKER,
        save,
      };

      userModel.findById.mockResolvedValue(user);

      const dto = {
        name: 'New Name',
        avatar: 'avatar.png',
        resume: 'resume.pdf',
      };

      const result = await service.updateProfie(
        user._id.toString(),
        dto as any,
      );

      expect(save).toHaveBeenCalled();

      expect(result.name).toBe('New Name');
      expect(result.avatar).toBe('avatar.png');
      expect(result.resume).toBe('resume.pdf');
    });

    it('should update EMPLOYER profile', async () => {
      const save = jest.fn();

      const user = {
        _id: new Types.ObjectId(),
        name: 'Company',
        avatar: '',
        role: Role.EMPLOYER,
        companyName: '',
        companyDescription: '',
        companyLogo: '',
        resume: '',
        save,
      };

      userModel.findById.mockResolvedValue(user);

      const dto = {
        companyName: 'ABC Pvt Ltd',
        companyDescription: 'Software Company',
        companyLogo: 'logo.png',
      };

      const result = await service.updateProfie(
        user._id.toString(),
        dto as any,
      );

      expect(save).toHaveBeenCalled();

      expect(result.companyName).toBe('ABC Pvt Ltd');
      expect(result.companyDescription).toBe('Software Company');
      expect(result.companyLogo).toBe('logo.png');
    });
  });

  describe('deleteResume', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should throw if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.deleteResume('id', {
          resumeUrl: 'uploads/test.pdf',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if user is not JOBSEEKER', async () => {
      userModel.findById.mockResolvedValue({
        role: Role.EMPLOYER,
      });

      await expect(
        service.deleteResume('id', {
          resumeUrl: 'uploads/test.pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete resume', async () => {
      const save = jest.fn();

      const user = {
        role: Role.JOBSEEKER,
        resume: 'resume.pdf',
        save,
      };

      userModel.findById.mockResolvedValue(user);

      const result = await service.deleteResume('id', {
        resumeUrl: 'http://localhost/uploads/resume.pdf',
      });

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Resume deleted successfully',
      });
    });
  });

  describe('remove', () => {
    it('should return remove message', () => {
      expect(service.remove('1')).toEqual('This action removes a #1 user');
    });
  });

  describe('getPublicProfile', () => {
    it('should throw if user not found', async () => {
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.getPublicProfile('id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return public profile', async () => {
      const user = {
        _id: new Types.ObjectId(),
        name: 'John',
        email: 'john@test.com',
        role: Role.JOBSEEKER,
        avatar: 'avatar.png',
        resume: 'resume.pdf',
        companyName: '',
        companyDescription: '',
        companyLogo: '',
        createdAt: new Date(),
      };

      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(user),
        }),
      });

      const result = await service.getPublicProfile(user._id.toString());

      expect(result.name).toBe(user.name);
      expect(result.email).toBe(user.email);
      expect(result.role).toBe(user.role);
    });
  });
});
