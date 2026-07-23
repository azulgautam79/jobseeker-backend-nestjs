import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role';
import { User } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false, nullable: true })
  avatar?: string | null;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ required: false, nullable: true })
  companyName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  companyDescription?: string | null;

  @ApiProperty({ required: false, nullable: true })
  companyLogo?: string | null;

  @ApiProperty({ required: false, nullable: true })
  resume?: string | null;
}
