/**
 * Mirrors the DTOs returned by back/Application/{Users,Departments,Programs}.
 * System.Text.Json's default camelCase policy on the API means these field
 * names match the JSON on the wire.
 */

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  isActive: boolean;
  /** Populated only for Student-role users with a linked Student record. */
  studentNumber: string | null;
  departmentId: string | null;
  departmentName: string | null;
  /** True when that Student uploaded a 1x1 ID photo at registration - see GET /api/users/{id}/photo. */
  hasPhoto: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  roles: string[];
  studentNumber?: string;
  departmentId?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
}

export interface UpdateUserRolesRequest {
  roles: string[];
}

export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  deanUserId: string | null;
  isActive: boolean;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
}

export interface UpdateDepartmentRequest {
  code: string;
  name: string;
  isActive: boolean;
}

export interface AssignDeanRequest {
  userId: string;
}

export interface SubjectDto {
  id: string;
  code: string;
  title: string;
  units: number;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
}

export interface CreateSubjectRequest {
  code: string;
  title: string;
  units: number;
  departmentId: string | null;
}

export interface UpdateSubjectRequest {
  code: string;
  title: string;
  units: number;
  departmentId: string | null;
  isActive: boolean;
}

export interface SectionDto {
  id: string;
  code: string;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
}

export interface CreateSectionRequest {
  code: string;
  departmentId: string;
}

export interface UpdateSectionRequest {
  code: string;
  departmentId: string;
  isActive: boolean;
}

export interface InstructorDto {
  id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
}

export interface CreateInstructorRequest {
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  departmentId: string;
}

export interface UpdateInstructorRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  isActive: boolean;
}
