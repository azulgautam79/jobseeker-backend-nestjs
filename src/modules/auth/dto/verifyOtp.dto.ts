import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Matches } from 'class-validator';
import { OtpType } from '../../../common/enums/otpType';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'johndoe@gmail.com',
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
    example: OtpType.VERIFY_EMAIL,
    enum: OtpType,
    description: 'Type of OTP being verified',
  })
  @IsEnum(OtpType)
  type!: OtpType;
}
