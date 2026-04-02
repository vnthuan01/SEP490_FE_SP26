import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  supplyTransferService,
  type CreateSupplyTransferPayload,
  type SearchSupplyTransferByStatusParams,
} from '@/services/supplyTransferService';
import { toast } from 'sonner';

export const SUPPLY_TRANSFER_KEYS = {
  all: ['supply-transfers'] as const,
  detail: (id: string) => ['supply-transfers', 'detail', id] as const,
  byStatus: (params?: SearchSupplyTransferByStatusParams) =>
    ['supply-transfers', 'by-status', params] as const,
  bySourceStation: (stationId: string) =>
    ['supply-transfers', 'by-source-station', stationId] as const,
  byDestinationStation: (stationId: string) =>
    ['supply-transfers', 'by-destination-station', stationId] as const,
};

export function useCreateSupplyTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplyTransferPayload) => supplyTransferService.create(data),
    onSuccess: () => {
      toast.success('Đã tạo phiếu chuyển hàng');
      queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.all });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Tạo phiếu chuyển hàng thất bại');
    },
  });
}

export function useSupplyTransfer(id: string) {
  return useQuery({
    queryKey: SUPPLY_TRANSFER_KEYS.detail(id),
    queryFn: async () => {
      const response = await supplyTransferService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useSupplyTransfersByStatus(params?: SearchSupplyTransferByStatusParams) {
  return useQuery({
    queryKey: SUPPLY_TRANSFER_KEYS.byStatus(params),
    queryFn: async () => {
      const response = await supplyTransferService.getByStatus(params);
      return response.data;
    },
  });
}

export function useSupplyTransfersBySourceStation(stationId: string) {
  return useQuery({
    queryKey: SUPPLY_TRANSFER_KEYS.bySourceStation(stationId),
    queryFn: async () => {
      const response = await supplyTransferService.getBySourceStation(stationId);
      return response.data;
    },
    enabled: !!stationId,
  });
}

export function useSupplyTransfersByDestinationStation(stationId: string) {
  return useQuery({
    queryKey: SUPPLY_TRANSFER_KEYS.byDestinationStation(stationId),
    queryFn: async () => {
      const response = await supplyTransferService.getByDestinationStation(stationId);
      return response.data;
    },
    enabled: !!stationId,
  });
}

function createStatusMutation(mutationFn: (id: string) => Promise<any>, successMessage: string) {
  return function useStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => mutationFn(id),
      onSuccess: (_, id) => {
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.all });
        queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.detail(id) });
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Cập nhật trạng thái thất bại');
      },
    });
  };
}

export const useApproveSupplyTransfer = createStatusMutation(
  supplyTransferService.approve,
  'Đã duyệt phiếu chuyển hàng',
);
export const useShipSupplyTransfer = createStatusMutation(
  supplyTransferService.ship,
  'Đã chuyển trạng thái giao hàng',
);
export const useReceiveSupplyTransfer = createStatusMutation(
  supplyTransferService.receive,
  'Đã xác nhận nhận hàng',
);
export const useCancelSupplyTransfer = createStatusMutation(
  supplyTransferService.cancel,
  'Đã huỷ phiếu chuyển hàng',
);
