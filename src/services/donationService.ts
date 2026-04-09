import { apiClient } from '@/lib/apiClients';

export const DonationStatus = {
  Pending: 0,
  Completed: 1,
  Failed: 2,
  Cancelled: 3,
  Expired: 4,
  Refunded: 5,
} as const;

export type DonationStatus = (typeof DonationStatus)[keyof typeof DonationStatus];

export interface CreateDonationCheckoutPayload {
  campaignId: string;
  amount: number;
  donorName: string;
  message?: string;
}

export interface DonationCheckoutResponse {
  donationId: string;
  orderCode: number;
  paymentLinkId?: string | null;
  checkoutUrl: string;
  expiresAt: string;
  status: DonationStatus;
}

export interface DonationStatusResponse {
  donationId: string;
  orderCode: number;
  amount: number;
  donorName: string;
  status: DonationStatus;
  donatedAt: string;
  expiresAt: string;
  processedAt?: string | null;
  checkoutUrl?: string | null;
}

export interface AdminDonationQueryParams {
  pageIndex?: number;
  pageSize?: number;
  status?: number;
  campaignId?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  period?: string;
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

export interface AdminDonationItem {
  donationId: string;
  campaignId: string;
  campaignName?: string | null;
  donorName: string;
  amount: number;
  message?: string | null;
  status: DonationStatus;
  orderCode: number;
  paymentLinkId?: string | null;
  donatedAt: string;
  expiresAt: string;
  processedAt?: string | null;
}

export interface AdminPaymentTransaction {
  paymentTransactionId: string;
  provider: string;
  reference?: string | null;
  eventCode?: string | null;
  eventDescription?: string | null;
  amount: number;
  currency: string;
  isSignatureValid: boolean;
  createdAt: string;
}

export interface AdminDonationDetail extends AdminDonationItem {
  message?: string | null;
  checkoutUrl?: string | null;
  gatewayResponse?: string | null;
  transactions: AdminPaymentTransaction[];
}

export interface AdminDonationStats {
  totalAmount: number;
  totalCount: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  expiredCount: number;
}

export const donationService = {
  createCheckout: (data: CreateDonationCheckoutPayload) =>
    apiClient.post<DonationCheckoutResponse>('/donations/checkout', data),

  getStatus: (donationId: string) =>
    apiClient.get<DonationStatusResponse>(`/donations/${donationId}/status`),

  getPaymentReturn: (params?: {
    code?: string;
    id?: string;
    cancel?: boolean;
    status?: string;
    orderCode?: number;
  }) => apiClient.get('/donations/payment-return', { params }),

  getPaymentCancel: (params?: {
    code?: string;
    id?: string;
    cancel?: boolean;
    status?: string;
    orderCode?: number;
  }) => apiClient.get('/donations/payment-cancel', { params }),

  getAdminDonations: (params?: AdminDonationQueryParams) =>
    apiClient.get<PaginatedResponse<AdminDonationItem>>('/donations/admin', { params }),

  getAdminDonationDetail: (id: string) =>
    apiClient.get<AdminDonationDetail>(`/donations/admin/${id}`),

  reconcileAdminDonation: (id: string) =>
    apiClient.post<DonationStatusResponse>(`/donations/admin/${id}/reconcile`),

  cancelAdminDonation: (id: string, reason?: string) =>
    apiClient.post<DonationStatusResponse>(`/donations/admin/${id}/cancel`, null, {
      params: { reason },
    }),

  getAdminStats: (params?: AdminDonationQueryParams) =>
    apiClient.get<AdminDonationStats>('/donations/admin/stats', { params }),

  exportAdminCsv: (params?: AdminDonationQueryParams) =>
    apiClient.get<Blob>('/donations/admin/export', {
      params,
      responseType: 'blob',
    }),
};
