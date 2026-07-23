import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role';

export class RegisterDto {
  @ApiProperty({
    description: 'User Name',
    example: 'Lemon Gautam',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'lemongautam79@gmail.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'Lemon123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 chearacters long' })
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  //     message:
  //         'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  // })
  password!: string;

  @ApiProperty({
    description: 'User Avatar',
    example: 'http://localhost:7000/uploads/lemon.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'User Avatar',
    example: 'http://localhost:7000/uploads/lemon.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarPublicId?: string;

  @ApiProperty({
    example: 'JOBSEEKER|EMPLOYER',
    description: 'Provide the role of the User',
    required: true,
  })
  @IsEnum(Role, { message: 'Role must be a valid role' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: Role;
}
