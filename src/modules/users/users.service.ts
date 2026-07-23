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
/**
 *! User Services
 */
@Injectable()
export class UsersService {
  //! DI
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async create(createUserDto: Partial<User>) {
    return await this.userModel.create(createUserDto);
  }

  /**
   *! Find all users
   */
  async findAll() {
    return await this.userModel.find();
  }

  /**
   *! Find user by email address
   */
  async findByEmail(email: string) {
    return await this.userModel.findOne({ email });
  }

  /**
   *! Find User by id
   */
  async findOne(id: string) {
    return await this.userModel.findById(id).select('-password');
  }

  /**
   *!  Update User profile
   */
  async updateProfie(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
    }

    // Avatar replaced
    else if (dto.avatarPublicId && dto.avatarPublicId !== user.avatarPublicId) {
      if (user.avatarPublicId) {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      }

      user.avatar = dto.avatar;
      user.avatarPublicId = dto.avatarPublicId;
    }

    /*
     * Resume replacement
     */
    // if (
    //   dto.resumePublicId && dto.resumePublicId !== user.resumePublicId
    // ) {
    //   if (user.resumePublicId) {
    //     try {
    //       await cloudinary.uploader.destroy(
    //         user.resumePublicId,
    //         {
    //           resource_type: 'raw',
    //         },
    //       );
    //       this.logger.info('Old resume deleted', {
    //         userId: user._id.toString(),
    //         email: user.email,
    //       })
    //     } catch (error) {
    //       this.logger.warn(
    //         'Failed to delete old resume',
    //         {
    //           userId,
    //           publicId: user.resumePublicId,
    //         },
    //       );
    //     }
    //   }

    //   user.resume = dto.resume;
    //   user.resumePublicId = dto.resumePublicId;
    // }

    if (dto.resume === '' && dto.resumePublicId === '') {
      if (user.resumePublicId) {
        await cloudinary.uploader.destroy(user.resumePublicId);
      }

      user.resume = '';
      user.resumePublicId = '';
    }

    // resume replaced
    else if (dto.resumePublicId && dto.resumePublicId !== user.resumePublicId) {
      if (user.resumePublicId) {
        await cloudinary.uploader.destroy(user.resumePublicId);
      }

      user.resume = dto.resume;
      user.resumePublicId = dto.resumePublicId;
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
      }
    }

    await user.save();
    this.logger.info('User Profile Updated', {
      userId: user._id.toString(),
      email: user.email,
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
  }

  /**
   *!  Delete Resume
   */
  async deleteResume(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.JOBSEEKER) {
      throw new ForbiddenException('Only jobseekers can delete resume');
    }

    if (user.resumePublicId) {
      try {
        await cloudinary.uploader.destroy(user.resumePublicId, {
          resource_type: 'raw',
        });

        this.logger.info('Resume deleted from Cloudinary', {
          userId: user._id.toString(),
          email: user.email,
        });
      } catch (error) {
        this.logger.warn('Failed to delete resume from Cloudinary', {
          userId,
          publicId: user.resumePublicId,
        });
      }
    }

    user.resume = '';
    user.resumePublicId = '';
    await user.save();
    return {
      message: 'Resume deleted successfully',
    };
  }

  /**
   *!   Delete a user
   */
  remove(id: string) {
    return `This action removes a #${id} user`;
  }

  //! Get Public profile
  async getPublicProfile(userId: string): Promise<PublicProfileResponseDto> {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

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
  }
}
