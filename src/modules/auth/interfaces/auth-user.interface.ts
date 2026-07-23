export interface AuthUser {
  _id: string;
  email: string;
  role: 'JOBSEEKER' | 'EMPLOYER';
}
