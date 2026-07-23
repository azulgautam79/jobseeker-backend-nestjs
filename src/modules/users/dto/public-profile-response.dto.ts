import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role';

export class PublicProfileResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ required: false })
  avatar?: string;

  @ApiProperty({ required: false })
  resume?: string;

  @ApiProperty({ required: false })
  companyName?: string;

  @ApiProperty({ required: false })
  companyDescription?: string;

  @ApiProperty({ required: false })
  companyLogo?: string;

  @ApiProperty()
  createdAt!: Date;
}
