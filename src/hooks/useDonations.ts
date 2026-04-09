import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  donationService,
  type AdminDonationQueryParams,
  type CreateDonationCheckoutPayload,
} from '@/services/donationService';
import { toast } from 'sonner';
import { FUND_QUERY_KEYS } from './useFunds';
import { CAMPAIGN_QUERY_KEYS } from './useCampaigns';

export const DONATION_QUERY_KEYS = {
  all: ['donations'] as const,
  status: (id: string) => ['donations', 'status', id] as const,
  adminList: (params?: AdminDonationQueryParams) => ['donations', 'admin', 'list', params] as const,
  adminDetail: (id: string) => ['donations', 'admin', 'detail', id] as const,
  adminStats: (params?: AdminDonationQueryParams) =>
    ['donations', 'admin', 'stats', params] as const,
};

export function useDonationStatus(donationId?: string, polling = false) {
  const query = useQuery({
    queryKey: DONATION_QUERY_KEYS.status(donationId || ''),
    queryFn: async () => {
      const response = await donationService.getStatus(donationId || '');
      return response.data;
    },
    enabled: !!donationId,
    refetchInterval: polling
      ? (query) => {
          const status = Number(query.state.data?.status ?? -1);
          return status === 0 ? 5000 : false;
        }
      : false,
  });

  return {
    ...query,
    donation: query.data,
  };
}

export function useCreateDonationCheckout() {
  return useMutation({
    mutationFn: async (payload: CreateDonationCheckoutPayload) => {
      const response = await donationService.createCheckout(payload);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể tạo liên kết thanh toán');
    },
  });
}

export function useAdminDonations(params?: AdminDonationQueryParams) {
  const query = useQuery({
    queryKey: DONATION_QUERY_KEYS.adminList(params),
    queryFn: async () => {
      const response = await donationService.getAdminDonations(params);
      return response.data;
    },
  });

  return {
    ...query,
    donations: query.data?.items || [],
    paging: query.data,
  };
}

export function useAdminDonationDetail(id?: string) {
  const query = useQuery({
    queryKey: DONATION_QUERY_KEYS.adminDetail(id || ''),
    queryFn: async () => {
      const response = await donationService.getAdminDonationDetail(id || '');
      return response.data;
    },
    enabled: !!id,
  });

  return {
    ...query,
    donationDetail: query.data,
  };
}

export function useAdminDonationStats(params?: AdminDonationQueryParams) {
  const query = useQuery({
    queryKey: DONATION_QUERY_KEYS.adminStats(params),
    queryFn: async () => {
      const response = await donationService.getAdminStats(params);
      return response.data;
    },
  });

  return {
    ...query,
    stats: query.data,
  };
}

function invalidateAdminDonationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DONATION_QUERY_KEYS.all });
  queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEYS.summary });
  queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEYS.contributions });
  queryClient.invalidateQueries({ queryKey: FUND_QUERY_KEYS.transactions });
  queryClient.invalidateQueries({ queryKey: CAMPAIGN_QUERY_KEYS.all });
}

export function useReconcileDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await donationService.reconcileAdminDonation(id);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Đã đối soát giao dịch quyên góp');
      invalidateAdminDonationQueries(queryClient);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể đối soát giao dịch');
    },
  });
}

export function useCancelDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await donationService.cancelAdminDonation(id, reason);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Đã hủy payment link đang chờ');
      invalidateAdminDonationQueries(queryClient);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể hủy payment link');
    },
  });
}

export function useDonationAdminExport(params?: AdminDonationQueryParams) {
  return useMutation({
    mutationFn: async () => {
      const response = await donationService.exportAdminCsv(params);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Không thể xuất CSV quyên góp');
    },
  });
}
