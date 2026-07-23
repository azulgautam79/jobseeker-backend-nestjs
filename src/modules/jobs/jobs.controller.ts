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
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Role } from '../../common/enums/role';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ModerateThrottler,
  RelaxedThrottler,
} from '../../common/decorators/custom-throttler.decorator';
import { ResponseCreateJobDto } from './dto/response-create-job.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JobQueryDto } from './dto/job-query.dto';

/**
 *! Jobs API controller
 */
@ApiTags('Jobs')
// @ApiBearerAuth('JWT-auth')
@Controller({
  path: 'jobs',
  version: ['2'],
})
export class JobsController {
  //! DI
  constructor(private readonly jobsService: JobsService) {}

  /**
   * !Create a new job
   *
   * @param createJobDto Job creation payload
   * @param user Authenticated employer
   * @returns Created job
   */
  @Post()
  @ModerateThrottler()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Create a new job',
  })
  @ApiBody({
    type: CreateJobDto,
  })
  @ApiCreatedResponse({
    description: 'Job created successfully',
    type: ResponseCreateJobDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  async create(@Body() createJobDto: CreateJobDto, @GetUser() user: any) {
    return this.jobsService.create(createJobDto, user);
  }

  /**
   *! Get All Jobs (Filtered/Paginated)
   */
  @Get()
  @RelaxedThrottler()
  @ApiOperation({
    summary: 'Get all jobs',
  })
  @ApiResponse({
    status: 200,
    description: 'Get all available jobs with filters, search and pagination',
    // type:GetAllJobsResponseDto
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  findAll(@Query() query: JobQueryDto) {
    return this.jobsService.findAll(query);
  }

  /**
   *! Get All Jobs Without Filters (For Home Page)
   */
  @Get('without-filters')
  @RelaxedThrottler()
  @ApiOperation({
    summary: 'Get all jobs without any filters',
  })
  @ApiResponse({
    status: 200,
    description: 'All available jobs without any filters',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  findJobsWithoutFilters() {
    return this.jobsService.findJobsWithoutFilters();
  }

  /**
   *! Get Jobs for Employers
   */
  @Get('get-jobs-employer')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Get all jobs created by an employer',
  })
  @ApiResponse({
    status: 200,
    description: 'Jobs created by an employer',
    // type:GetAllJobsResponseDto
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  findEmployerJobs(@GetUser() user: any) {
    return this.jobsService.findEmployerJobs(user);
  }

  /**
   * Get recommended jobs for logged-in user
   */
  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get recommended jobs',
  })
  async getRecommendedJobs(@GetUser() user: any) {
    return this.jobsService.getRecommendedJobs(user._id);
  }

  /**
   *! Toggle Close Job
   */
  @Patch(':id/toggle-close')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Close to a job',
  })
  @ApiResponse({
    status: 200,
    description: 'Job closed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only Employer can close a job',
  })
  @ApiResponse({
    status: 404,
    description: 'Job doesnot exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  toggleClose(@Param('id') id: string, @GetUser() user: any) {
    return this.jobsService.toggleClose(id, user);
  }

  /**
   *! Get Single Job
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a job by id',
  })
  @ApiResponse({
    status: 200,
    // type:GetAllJobsResponseDto
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  findOne(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    // @GetUser() userId?: any,
  ) {
    return this.jobsService.findOne(id, userId);
  }

  /**
   *! Update Job
   */
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Update a job by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Job successfully updated',
    // type:GetAllJobsResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Only employer can update a job',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  @ApiResponse({
    status: 404,
    description: 'Job doesnot exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: any,
  ) {
    return this.jobsService.update(id, updateJobDto, user);
  }

  /**
   *! Delete Job
   */
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Delete a job',
  })
  @ApiResponse({
    status: 200,
    description: 'Delete a job by id',
  })
  @ApiResponse({
    status: 403,
    description: 'Only Employer can delete a job',
  })
  @ApiResponse({
    status: 404,
    description: 'Job doesnot exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many requests - rate limit exceeded',
  })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.jobsService.remove(id, user);
  }
}
