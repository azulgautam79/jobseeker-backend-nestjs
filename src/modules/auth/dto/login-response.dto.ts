import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role';

export class LoginResponseDto {
  @ApiProperty({
    example: '65c3f7a1b1a3f3c8b4d12345',
    description: 'User ID',
  })
  _id!: string;

  @ApiProperty({
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    example: 'johndoe@gmail.com',
  })
  email!: string;

  @ApiProperty({
    example: 'avatar.png',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    enum: Role,
    example: Role.JOBSEEKER,
  })
  role!: Role;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  token!: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  companyName!: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  companyDescription!: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  companyLogo!: string;

  @ApiProperty({
    example: '',
    required: false,
  })
  resume!: string;
}
