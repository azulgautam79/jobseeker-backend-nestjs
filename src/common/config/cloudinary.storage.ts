import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.config';

export const avatarStorage = new CloudinaryStorage({
  cloudinary,

  params: (req: any) => ({
    folder: 'jobseeker/avatars',

    allowed_formats: ['jpg', 'jpeg', 'png'],

    public_id: `${req.user.name}-avatar`,

    overwrite: true,
    invalidate: true,
  }),
});

export const companyLogosStorage = new CloudinaryStorage({
  cloudinary,

  params: (req: any) => ({
    folder: 'jobseeker/companyLogos',

    allowed_formats: ['jpg', 'jpeg', 'png'],

    public_id: `${req.user.name}-company-logo`,

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

    public_id: `${req.user.name}-resume`,

    overwrite: true,
    invalidate: true,
  }),
});
