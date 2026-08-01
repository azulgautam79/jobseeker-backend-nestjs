import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import * as fs from 'fs';
import * as path from 'path';
import { DeleteResumeDto } from './dto/delete-resume.dto';
import { Role } from '../../common/enums/role';
import { PublicProfileResponseDto } from './dto/public-profile-response.dto';
import cloudinary from '../../common/config/cloudinary.config';
import { LoggerService } from '../../common/logger/logger.service';
import { ContextLogger } from '../../common/logger/context-logger';
import { LoggerFactory } from '../../common/logger/logger.factory';
import { Trace } from '../../common/telemetry/tracing/trace.decorator';
import { TraceService } from '../../common/telemetry/tracing/trace.service';
/**
 *! User Services
 */
@Injectable()
export class UsersService {

  private readonly logger: ContextLogger;

  //! DI
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private readonly traceService: TraceService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger =
      loggerFactory.create(
        UsersService.name,
      );
  }

  @Trace('users.create')
  async create(createUserDto: Partial<User>) {
    return await this.userModel.create(createUserDto);
  }

  /**
   *! Find all users
   */
  @Trace('users.find-all')
  async findAll() {

    this.logger.info('Fina all users requested');

    try {
      const users = await this.userModel.find();

      this.traceService.setCurrentAttribute('users.count', users.length);
      this.traceService.addCurrentEvent('Users retrieved successfully');

      this.logger.info('Users retrieved successfully', {
        count: users.length,
      });

      return users;

    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to retrieve users',
        error,
      );

      throw error;
    }
  }

  /**
   *! Find user by email address
   */
  @Trace('users.find-by-email')
  async findByEmail(email: string) {

    this.logger.info('Find user by email requested', { email });

    this.traceService.setCurrentAttribute('auth.email', email);

    try {
      const user = await this.userModel.findOne({ email });

      if (!user) {
        this.traceService.addCurrentEvent(
          'User not found',
        );

        this.logger.warn('User not found', {
          email,
        });

        return null;
      }

      this.traceService.setCurrentAttribute(
        'user.id',
        user.id,
      );

      this.traceService.addCurrentEvent(
        'User found',
      );

      this.logger.info('User found', {
        userId: user.id,
        email: user.email,
      });

      return user;

    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to find user by email',
        error,
        {
          email,
        },
      );

      throw error;
    }
  }

  /**
   *! Find User by id
   */
  @Trace('users.find-by-id')
  async findOne(id: string) {

    this.logger.info('Find user by id requested', { id });
    this.traceService.setCurrentAttribute('auth.id', id);

    try {
      const user = await this.userModel.findById(id).select('-password');

      if (!user) {
        this.traceService.addCurrentEvent('User not found');
        this.logger.warn('User not found', { id });
        return null;
      }

      this.traceService.setCurrentAttribute('user.id', user.id);
      this.traceService.addCurrentEvent('User found');
      this.logger.info('User found', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error('Failed to find user by id', error, { id });

      throw error;
    }
  }

  /**
   *!  Update User profile
   */
  @Trace('users.update-profile')
  async updateProfie(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {

    this.logger.info('Profile update requested', {
      userId,
    });

    this.traceService.setCurrentAttribute(
      'user.id',
      userId,
    );

    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.traceService.addCurrentEvent(
          'User not found',
        );

        this.logger.warn('Profile update failed - user not found', {
          userId,
        });
        throw new NotFoundException('User not found');
      }

      this.traceService.setCurrentAttribute(
        'user.role',
        user.role,
      );

      user.name = dto.name ?? user.name;
      user.skills = dto.skills ?? user.skills;
      user.experience = dto.experience ?? user.experience;
      user.preferredCategory = dto.preferredCategory ?? user.preferredCategory;
      user.preferredLocation = dto.preferredLocation ?? user.preferredLocation;

      /*
       * Avatar replacement
       */
      if (dto.avatar === '' && dto.avatarPublicId === '') {
        if (user.avatarPublicId) {
          await cloudinary.uploader.destroy(user.avatarPublicId);
        }

        user.avatar = '';
        user.avatarPublicId = '';

        this.traceService.addCurrentEvent(
          'Avatar removed',
        );

        this.logger.info('Avatar removed', {
          userId,
        });
      }

      // Avatar replaced
      else if (dto.avatarPublicId && dto.avatarPublicId !== user.avatarPublicId) {
        if (user.avatarPublicId) {
          await cloudinary.uploader.destroy(user.avatarPublicId);
        }

        user.avatar = dto.avatar;
        user.avatarPublicId = dto.avatarPublicId;

        this.traceService.addCurrentEvent(
          'Avatar updated',
        );

        this.logger.info('Avatar updated', {
          userId,
        });
      }

      if (dto.resume === '' && dto.resumePublicId === '') {
        if (user.resumePublicId) {
          await cloudinary.uploader.destroy(user.resumePublicId);
        }

        user.resume = '';
        user.resumePublicId = '';
        this.traceService.addCurrentEvent(
          'Resume removed',
        );

        this.logger.info('Resume removed', {
          userId,
        });
      }

      // resume replaced
      else if (dto.resumePublicId && dto.resumePublicId !== user.resumePublicId) {
        if (user.resumePublicId) {
          await cloudinary.uploader.destroy(user.resumePublicId);
        }

        user.resume = dto.resume;
        user.resumePublicId = dto.resumePublicId;
        this.traceService.addCurrentEvent(
          'Resume updated',
        );

        this.logger.info('Resume updated', {
          userId,
        });
      }

      if (user.role === 'EMPLOYER') {
        user.companyName = dto.companyName ?? user.companyName;
        user.companyDescription =
          dto.companyDescription ?? user.companyDescription;
        /*
         * Company logo replacement
         */
        if (dto.companyLogo === '' && dto.companyLogoPublicId === '') {
          if (user.companyLogoPublicId) {
            await cloudinary.uploader.destroy(user.companyLogoPublicId);
          }

          user.companyLogo = '';
          user.companyLogoPublicId = '';

          this.traceService.addCurrentEvent(
            'Resume updated',
          );

          this.logger.info('Resume updated', {
            userId,
          });
        }

        // companyLogo replaced
        else if (
          dto.companyLogoPublicId &&
          dto.companyLogoPublicId !== user.companyLogoPublicId
        ) {
          if (user.companyLogoPublicId) {
            await cloudinary.uploader.destroy(user.companyLogoPublicId);
          }

          user.companyLogo = dto.companyLogo;
          user.companyLogoPublicId = dto.companyLogoPublicId;

          this.traceService.addCurrentEvent(
            'Company logo removed',
          );

          this.logger.info('Company logo removed', {
            userId,
          });
        }
      }

      await user.save();
      this.traceService.addCurrentEvent(
        'Company logo updated',
      );

      this.logger.info('Company logo updated', {
        userId,
      });

      return {
        _id: user._id.toString(),
        name: user.name,
        experience: user.experience,
        skills: user.skills,
        preferredCategory: user.preferredCategory,
        preferredLocation: user.preferredLocation,
        avatar: user.avatar,
        role: user.role,
        companyName: user.companyName || '',
        companyDescription: user.companyDescription || '',
        companyLogo: user.companyLogo || '',
        resume: user.resume || '',
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to update user profile',
        error,
        {
          userId,
        },
      );

      throw error;
    }
  }

  /**
   *! Delete Resume
   */
  @Trace('users.delete-resume')
  async deleteResume(userId: string) {
    this.logger.info('Resume deletion requested', {
      userId,
    });

    this.traceService.setCurrentAttribute(
      'user.id',
      userId,
    );

    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        this.traceService.addCurrentEvent(
          'User not found',
        );

        this.logger.warn('Resume deletion failed - user not found', {
          userId,
        });

        throw new NotFoundException('User not found');
      }

      if (user.role !== Role.JOBSEEKER) {
        this.traceService.addCurrentEvent(
          'User is not a job seeker',
        );

        this.logger.warn(
          'Resume deletion failed - invalid role',
          {
            userId,
            role: user.role,
          },
        );

        throw new ForbiddenException(
          'Only jobseekers can delete resume',
        );
      }

      if (user.resumePublicId) {
        try {
          await cloudinary.uploader.destroy(
            user.resumePublicId,
            {
              resource_type: 'raw',
            },
          );

          this.traceService.addCurrentEvent(
            'Resume deleted from Cloudinary',
          );

          this.logger.info(
            'Resume deleted from Cloudinary',
            {
              userId,
            },
          );
        } catch (error) {
          this.traceService.addCurrentEvent(
            'Cloudinary resume deletion failed',
          );

          this.logger.warn(
            'Failed to delete resume from Cloudinary',
            {
              userId,
              publicId: user.resumePublicId,
            },
          );

          // Intentionally continue.
        }
      }

      user.resume = '';
      user.resumePublicId = '';

      await user.save();

      this.traceService.addCurrentEvent(
        'Resume references removed from database',
      );

      this.logger.info(
        'Resume deleted successfully',
        {
          userId,
        },
      );

      return {
        message: 'Resume deleted successfully',
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to delete resume',
        error,
        {
          userId,
        },
      );

      throw error;
    }
  }

  /**
   *!   Delete a user
   */
  @Trace('users.delete-user')
  remove(id: string) {
    return `This action removes a #${id} user`;
  }

  //! Get Public profile
  @Trace('users.get-public-profile')
  async getPublicProfile(userId: string): Promise<PublicProfileResponseDto> {

    this.logger.info('Public profile requested', { userId });

    this.traceService.setCurrentAttribute('user.id', userId);

    try {
      const user = await this.userModel
        .findById(userId)
        .select('-password')
        .lean();

      if (!user) {
        this.traceService.addCurrentEvent('User not found');
        this.logger.warn('Public profile not found', { userId });
        throw new NotFoundException('User not found');
      }

      this.traceService.addCurrentEvent('Public profile retrieved successfully');
      this.logger.info('Public profile retrieved successfully', { userId });

      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        resume: user.resume ?? '',
        companyName: user.companyName ?? '',
        companyDescription: user.companyDescription ?? '',
        companyLogo: user.companyLogo ?? '',
        createdAt: user.createdAt,
      };
    } catch (error) {
      this.traceService.setCurrentError(error);

      this.logger.error(
        'Failed to retrieve public profile',
        error,
        {
          userId,
        },
      );

      throw error;
    }

  }
}
