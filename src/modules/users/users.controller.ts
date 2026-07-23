import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { DeleteResumeDto } from './dto/delete-resume.dto';
import { PublicProfileResponseDto } from './dto/public-profile-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role';

/**
 *! Users API controller
 */
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'user',
  version: ['2'],
})
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post()
  // create(@Body() createUserDto: CreateUserDto) {
  //   return this.usersService.create(createUserDto);
  // }

  /**
   *! Get all users [ADMIN]
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'View all the users',
  })
  @ApiResponse({
    status: 200,
    description: 'All users fetched successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only Admin can view all users',
  })
  @ApiResponse({
    status: 404,
    description: 'Users doesnot exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   *! Get users by id
   */
  @Get(':id')
  // @UseGuards(RolesGuard)
  // @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Fetch a user by Id',
  })
  @ApiResponse({
    status: 200,
    description: 'User fetched successfully',
    // type: RegisterResponseDto
  })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Only Employer can view all users',
  // })
  @ApiResponse({
    status: 404,
    description: 'Users doesnot exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   *! Update user profile
   */
  @Patch('profile')
  @ApiOperation({
    summary: 'Update a user profile',
    description: 'Update a user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User with this id doesnot exist',
  })
  async updateProfile(
    @GetUser('_id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.usersService.updateProfie(userId, updateProfileDto);
  }

  /**
   *! Delete a user
   */
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.usersService.remove(id);
  // }

  /**
   *! Delete a resume
   */
  @Delete('resume')
  @UseGuards(RolesGuard)
  @Roles(Role.JOBSEEKER)
  @ApiOperation({
    summary: 'Delete resume of a user',
  })
  @ApiResponse({
    status: 200,
    description: 'Resume deleted successfully',
    // type: RegisterResponseDto
  })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Only Employer can view all users',
  // })
  @ApiResponse({
    status: 404,
    description: 'Users resume doesnot exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  async removeResume(@GetUser('_id') userId: string) {
    return this.usersService.deleteResume(userId);
  }

  /**
   *! Get Public Profile
   */
  @Get('public/:id')
  @ApiOperation({
    summary: 'Displays a users public profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: PublicProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User with this id doesnot exist',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
