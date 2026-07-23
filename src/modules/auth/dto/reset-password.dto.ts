import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'lemongautam79@gmail.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit numeric OTP',
  })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits and contain only numbers',
  })
  otp!: string;

  @ApiProperty({
    description: 'User password',
    example: 'Lemon123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  newPassword!: string;
}
