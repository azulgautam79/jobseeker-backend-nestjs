import { ApiProperty } from '@nestjs/swagger';

export class SaveJobDto {
  @ApiProperty({ description: 'Job ID to save' })
  jobId!: string;
}
