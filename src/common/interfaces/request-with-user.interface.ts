export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    // Add other user properties as needed
  };
}
