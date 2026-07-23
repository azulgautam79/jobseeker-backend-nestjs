import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application.dto';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role';

/**
 *! Job Application API controller
 */
@ApiTags('Applications')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'applications',
  version: ['2'],
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  //! DI
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   *! Apply to a Job
   */
  @Post(':jobId')
  @Roles(Role.JOBSEEKER)
  @ApiOperation({
    summary: 'Apply to a job',
    description: 'Creates a new user account',
  })
  @ApiResponse({
    status: 201,
    description: 'Applied to a job successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only Job Seeker can apply to a job',
  })
  @ApiResponse({
    status: 404,
    description: 'Job doesnot exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  // @ApiForbiddenResponse({
  //   description: 'Only Job Seeker can apply to a job',
  // })
  async applyToJob(@Req() req, @Param('jobId') jobId: string) {
    return this.applicationsService.applyToJob(
      req.user,
      jobId,
      req.user.resume,
    );
  }

  /**
   *! Get My Own Application [JOBSEEKER]
   */
  @Get('me')
  @Roles(Role.JOBSEEKER)
  @ApiOperation({
    summary: 'View all the applications of a user',
  })
  @ApiResponse({
    status: 200,
    description: 'Get application that user has submitted for a job',
  })
  @ApiResponse({
    status: 403,
    description: 'Only Job Seeker can view their application',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getMyApplications(@Req() req) {
    return this.applicationsService.getMyApplications(req.user._id);
  }

  /**
   *! Get all the applicants (users) who have applied for a job [EMPLOYER]
   */
  @Get('job/:jobId')
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Get applicants for a job',
  })
  @ApiResponse({
    status: 201,
    description: 'Applied to a job successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only Job Seeker can view applicants for a job',
  })
  @ApiResponse({
    status: 404,
    description: 'Job doesnot exist',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getApplicantsForJob(@Req() req, @Param('jobId') jobId: string) {
    return this.applicationsService.getApplicantsForJob(jobId, req.user._id);
  }

  /**
   *! Get Application by Id
   */
  @Get(':id')
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Get Application by Id',
  })
  @ApiResponse({
    status: 200,
    description: 'Applied to a job successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only Employer can view the applications for a job',
  })
  @ApiResponse({
    status: 404,
    description: 'Application doesnot exist',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getApplicationById(@Req() req, @Param('id') id: string) {
    return this.applicationsService.getApplicationById(id, req.user._id);
  }

  /**
   *!  Update an application
   */
  @Patch(':id/status')
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Update the job application',
  })
  @ApiResponse({
    status: 200,
    description: 'Job Application updated successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Application doesnot exist',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, req.user._id, dto.status);
  }
}
