import { Role } from '../../../common/enums/role';

export class ProfileResponseDto {
  _id!: string;
  name!: string;

  skills?: string[];
  experience?: number;
  preferredCategory?: string;
  preferredLocation?: string;

  avatar?: string;
  avatarPublicId?: string;
  role!: Role;
  companyName?: string;
  companyDescription?: string;
  companyLogo?: string;
  companyLogoPublicId?: string;
  resume?: string;
  resumePublicId?: string;
}
