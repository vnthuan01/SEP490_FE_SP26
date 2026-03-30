import { apiClient } from '@/lib/apiClients';
import type { Skill } from './skillsService';

export interface Certificate {
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string;
  fileUrl: string;
}

export interface VolunteerProfile {
  volunteerProfileId: string;
  userId?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  descriptions: string;
  verificationStatus: number;
  yearsOfExperience: number;
  preferredTeamRole: number;
  skills: any[]; // Could be array of strings or Skill objects depending on the endpoint
  certificates: Certificate[];
  // properties from pending-applications / review-applications
  appliedAt?: string;
  status?: number;
  verifiedBy?: string;
  verifiedAt?: string;
  reason?: string;
  volunteerType?: number;
}

export interface CreateVolunteerProfilePayload {
  skillIds: string[];
  descriptions: string;
  yearsOfExperience: number;
  preferredTeamRole: number;
  certificates: Certificate[];
}

export interface PaginatedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export interface SearchVolunteerProfileParams {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface SearchVolunteerProfileApplicationsParams {
  search?: string;
  verificationStatus?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface UpdateVolunteerProfileSkillsPayload {
  skillIds: string[];
}

export const volunteerProfileService = {
  // Create profile
  create: (data: CreateVolunteerProfilePayload) =>
    apiClient.post<VolunteerProfile>('/VolunteerProfile', data),

  // Get all paginated
  getAll: (params?: SearchVolunteerProfileParams) =>
    apiClient.get<PaginatedResponse<VolunteerProfile>>('/VolunteerProfile', { params }),

  // Get my profile
  getMyProfile: () => apiClient.get<VolunteerProfile>('/VolunteerProfile/my-profile'),

  // Get pending applications
  getPendingApplications: (params?: SearchVolunteerProfileApplicationsParams) =>
    apiClient.get<PaginatedResponse<VolunteerProfile>>('/VolunteerProfile/pending-applications', {
      params,
    }),

  // Get review applications
  getReviewApplications: (params?: SearchVolunteerProfileApplicationsParams) =>
    apiClient.get<PaginatedResponse<VolunteerProfile>>('/VolunteerProfile/review-applications', {
      params,
    }),

  // Approve application
  approve: (id: string) => apiClient.put<VolunteerProfile>(`/VolunteerProfile/${id}/approve`),

  // Reject application
  reject: (id: string, reason: string) =>
    apiClient.put<VolunteerProfile>(`/VolunteerProfile/${id}/reject`, `"${reason}"`, {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Add skills
  addSkills: (data: UpdateVolunteerProfileSkillsPayload) =>
    apiClient.post<VolunteerProfile>('/VolunteerProfile/skills', data),

  // Remove skills
  removeSkills: (data: UpdateVolunteerProfileSkillsPayload) =>
    apiClient.delete<VolunteerProfile>('/Voluntehttps://github.com/vnthuan01/SEP490_FE_SP25/pull/15/conflict?name=src%252Fservices%252FuserService.ts&base_oid=9ef2ada36975c49e4007e3ccd4784aea6275aaec&head_oid=a2c67fd118427d2dcb90904751d5b88a2e16349ferProfile/skills', { data }),

  // Get my skills
  getMySkills: () => apiClient.get<Skill[]>('/VolunteerProfile/skills'),
};
