import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployerAnalyticsResponseDto } from './dto/analytics-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../..//common/enums/role';

/**
 *! Analytics API controller
 */
@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'analytics',
  version: ['2'],
})
export class AnalyticsController {
  //! DI
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   *! Get Employer Analytics
   */
  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({
    summary: 'Employee Analytics Overview',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics Overview',
    type: EmployerAnalyticsResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests',
  })
  getEmployerAnalytics(@Req() req): Promise<EmployerAnalyticsResponseDto> {
    return this.analyticsService.getEmployerAnalytics(
      req.user._id,
      req.user.role,
    );
  }
}
