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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role';
import { SavedJobsService } from './savedJobs.service';

/**
 *! Saved Jobs API controller
 */
@ApiTags('Saved Jobs')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'saved-jobs',
  version: ['1', '2'],
})
@UseGuards(JwtAuthGuard)
// @Roles(Role.JOBSEEKER)
export class SavedJobsController {
  //! DI
  constructor(private readonly savedJobsService: SavedJobsService) {}

  /**
   *! Save a job for later
   */
  @Post(':jobId')
  @ApiOperation({
    summary: 'Save a job',
  })
  @ApiResponse({
    status: 201,
    description: 'Job saved successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only Job Seeker can save a job',
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
  async saveJob(@Req() req, @Param('jobId') jobId: string) {
    return await this.savedJobsService.saveJob(jobId, req.user._id);
  }

  /**
   *! Unsave a job
   */
  @Delete(':jobId')
  @ApiOperation({
    summary: 'Unsave a job',
  })
  @ApiResponse({
    status: 201,
    description: 'Job unsaved successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only Job Seeker can unsave a job',
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
  async unsaveJob(@Req() req, @Param('jobId') jobId: string) {
    return await this.savedJobsService.unsaveJob(jobId, req.user._id);
  }

  /**
   *! Get all the saved job by me
   */
  @Get('my')
  @ApiOperation({
    summary: 'Get all my saved jobs',
  })
  @ApiResponse({
    status: 200,
    description: 'Saved jobs fetched successfully',
    // type: RegisterResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only Job Seeker can view all saved jobs',
  })
  @ApiResponse({
    status: 404,
    description: 'Jobs doesnot exist',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getMySavedJobs(@Req() req) {
    return await this.savedJobsService.getMySavedJobs(req.user._id);
  }
}
