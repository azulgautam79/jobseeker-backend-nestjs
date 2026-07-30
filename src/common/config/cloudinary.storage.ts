import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.config';

const sanitizePublicId = (name: string, suffix: string) =>
  `${name}-${suffix}`
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '');

export const avatarStorage = new CloudinaryStorage({
  cloudinary,

  params: (req: any) => ({
    folder: 'jobseeker/avatars',

    allowed_formats: ['jpg', 'jpeg', 'png'],

    public_id: sanitizePublicId(req.user.name, 'avatar'),

    overwrite: true,
    invalidate: true,
  }),
});

export const companyLogosStorage = new CloudinaryStorage({
  cloudinary,

  params: (req: any) => ({
    folder: 'jobseeker/companyLogos',

    allowed_formats: ['jpg', 'jpeg', 'png'],

    public_id: sanitizePublicId(req.user.name, 'company-logo'),

    overwrite: true,
    invalidate: true,
  }),
});

export const resumeStorage = new CloudinaryStorage({
  cloudinary,

  params: (req: any) => ({
    folder: 'jobseeker/resumes',

    resource_type: 'raw',

    allowed_formats: ['pdf'],

    public_id: `${req.user.name}-resume`
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '') + '.pdf',

    overwrite: true,
    invalidate: true,
  }),
});
