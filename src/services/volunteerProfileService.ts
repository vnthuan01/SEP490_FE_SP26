import { apiClient } from '@/lib/apiClients';

export interface VolunteerSkill {
  skillId: string;
  code: string;
  name: string;
  description: string;
}

export interface VolunteerCertificate {
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string;
  fileUrl: string;
}

export interface VolunteerApplication {
  volunteerProfileId: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  appliedAt: string;
  verificationStatus: number;
  status: number;
  verifiedBy: string;
  verifiedAt: string;
  reason: string;
  descriptions: string;
  yearsOfExperience: number;
  preferredTeamRole: number;
  volunteerType: number;
  skills: VolunteerSkill[];
  certificates: VolunteerCertificate[];
}

export interface VolunteerProfile {
  volunteerProfileId: string;
  userId?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  yearsOfExperience?: number;
  preferredTeamRole?: number;
  volunteerType?: number;
  verificationStatus?: number;
  status?: number;
  reason?: string;
  skills?: VolunteerSkill[];
  certificates?: VolunteerCertificate[];
}

export interface PagedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export interface SearchVolunteerProfileParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  verificationStatus?: number;
}

export interface SearchVolunteerProfileApplicationsParams {
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateVolunteerProfilePayload {
  yearsOfExperience?: number;
  preferredTeamRole?: number;
  volunteerType?: number;
  descriptions?: string;
  skillIds?: string[];
}

export interface UpdateVolunteerProfileSkillsPayload {
  skillIds: string[];
}

export const volunteerProfileService = {
  getAll: (params?: SearchVolunteerProfileParams) =>
    apiClient.get<PagedResponse<VolunteerProfile>>('/VolunteerProfile', {
      params: {
        PageIndex: params?.pageIndex,
        PageSize: params?.pageSize,
        Search: params?.search,
        VerificationStatus: params?.verificationStatus,
      },
    }),

  getMyProfile: () => apiClient.get<VolunteerProfile>('/VolunteerProfile/my-profile'),

  getPendingApplications: (params?: SearchVolunteerProfileApplicationsParams) =>
    apiClient.get<PagedResponse<VolunteerApplication>>('/VolunteerProfile/review-applications', {
      params: {
        PageIndex: params?.pageIndex,
        PageSize: params?.pageSize,
      },
    }),

  getReviewApplications: (params?: SearchVolunteerProfileApplicationsParams) =>
    apiClient.get<PagedResponse<VolunteerApplication>>('/VolunteerProfile/review-applications', {
      params: {
        PageIndex: params?.pageIndex,
        PageSize: params?.pageSize,
      },
    }),

  getMySkills: () => apiClient.get<VolunteerSkill[]>('/VolunteerProfile/my-skills'),

  create: (data: CreateVolunteerProfilePayload) => apiClient.post('/VolunteerProfile', data),

  approve: (id: string) => apiClient.put(`/VolunteerProfile/${id}/approve`),
  approveApplication: (id: string) => apiClient.put(`/VolunteerProfile/${id}/approve`),

  reject: (id: string, reason: string) =>
    apiClient.put(`/VolunteerProfile/${id}/reject`, reason, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  rejectApplication: (id: string, reason: string) =>
    apiClient.put(`/VolunteerProfile/${id}/reject`, reason, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),

  addSkills: (data: UpdateVolunteerProfileSkillsPayload) =>
    apiClient.put('/VolunteerProfile/my-skills', data),

  removeSkills: (data: UpdateVolunteerProfileSkillsPayload) =>
    apiClient.delete('/VolunteerProfile/my-skills', { data }),
};
