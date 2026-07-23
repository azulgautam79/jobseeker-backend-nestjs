import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
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
  password!: string;

  @ApiProperty({
    description:
      'How long shoudl a user be able to access without needing to login again and again',
    example: 'true for 7 days, false for 1 day',
  })
  @IsBoolean()
  rememberMe?: boolean;
}
