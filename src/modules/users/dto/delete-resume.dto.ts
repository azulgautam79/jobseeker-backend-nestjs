import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteResumeDto {
  @ApiProperty({
    example: 'http://localhost:3000/uploads/resume.pdf',
    description: 'Resume file URL',
  })
  @IsString()
  @IsNotEmpty()
  resumeUrl!: string;
}
