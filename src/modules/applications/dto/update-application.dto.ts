import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums/applicationStatus';

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus, {
    message: `status must be one of: ${Object.values(ApplicationStatus).join(', ')}`,
  })
  status!: ApplicationStatus;
}
