export type UserRole = "citizen" | "responder" | "admin";

export interface AuthContextValue {
  user: unknown;
  role: string | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string>;
  signup: (
    email: string,
    password: string,
    full_name: string,
    signupRole: UserRole
  ) => Promise<string>;
  logout: () => Promise<void>;
}
