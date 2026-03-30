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

export interface PagedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export const volunteerProfileService = {
  getReviewApplications: (params?: { pageIndex?: number; pageSize?: number }) =>
    apiClient.get<PagedResponse<VolunteerApplication>>('/VolunteerProfile/review-applications', {
      params: {
        PageIndex: params?.pageIndex,
        PageSize: params?.pageSize,
      },
    }),

  approveApplication: (id: string) => apiClient.put(`/VolunteerProfile/${id}/approve`),

  rejectApplication: (id: string, reason: string) =>
    apiClient.put(`/VolunteerProfile/${id}/reject`, reason, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),
};
