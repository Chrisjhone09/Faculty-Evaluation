/**
 * Mirrors the DTOs returned by back/Application/Auth/Dtos/AuthDtos.cs.
 * ASP.NET Core's default System.Text.Json policy for Web API controllers is
 * camelCase, so these field names match the JSON the API actually sends.
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  departmentId: string | null;
  studentId: string | null;
  instructorId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  user: CurrentUser;
}

/**
 * Public self-registration is Student-only by design - there's no role field
 * here on purpose. The account comes back inactive; an Admin approves it
 * from Users before it can sign in.
 */
export interface RegisterStudentRequest {
  email: string;
  password: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  studentNumber: string;
  departmentId: string;
}

export interface RegisterStudentResponse {
  message: string;
  isApproved: boolean;
}

/** Mirrors back/Domain/Constants/StudentPhoto.cs. Client-side check only - the API re-validates regardless. */
export const STUDENT_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const STUDENT_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png'];

/** Canonical role names - must match back/Domain/Constants/AppRoles.cs. */
export const AppRoles = {
  Admin: 'Admin',
  Dean: 'Dean',
  Instructor: 'Instructor',
  Student: 'Student',
  Guidance: 'Guidance',
} as const;

export type AppRole = (typeof AppRoles)[keyof typeof AppRoles];

/** Where to land a user right after login, based on their (first) role. */
export function roleHomePath(roles: string[]): string {
  if (roles.includes(AppRoles.Admin)) return '/admin';
  if (roles.includes(AppRoles.Dean)) return '/dean';
  if (roles.includes(AppRoles.Instructor)) return '/instructor';
  if (roles.includes(AppRoles.Student)) return '/student';
  if (roles.includes(AppRoles.Guidance)) return '/guidance';
  return '/unauthorized';
}
