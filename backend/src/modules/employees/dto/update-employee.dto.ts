import { CreateEmployeeDto } from './create-employee.dto.js';

export class UpdateEmployeeDto implements Partial<CreateEmployeeDto> {
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  profilePhotoUrl?: string;
  dateOfBirth?: string;
  jobTitleId?: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  membershipId?: string;
  employmentType?: CreateEmployeeDto['employmentType'];
  employmentStatus?: CreateEmployeeDto['employmentStatus'];
  joinDate?: string;
  probationEndDate?: string;
  workLocation?: string;
  address?: Record<string, unknown>;
  emergencyContact?: Record<string, unknown>;
  bio?: string;
  certifications?: unknown;
}
