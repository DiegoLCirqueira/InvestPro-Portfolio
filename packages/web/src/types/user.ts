export type UserRole = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}
