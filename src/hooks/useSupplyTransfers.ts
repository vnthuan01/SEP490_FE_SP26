import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  supplyTransferService,
  type CreateSupplyTransferDocumentPayload,
  type AppendSupplyTransferEvidencesPayload,
  type CreateSupplyTransferPayload,
  type ReplaceSupplyTransferEvidenceUrlsPayload,
  type SearchSupplyTransferByStatusParams,
} from '@/services/supplyTransferService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';

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
      handleHookError(error, 'Không thể tạo phiếu chuyển hàng');
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

export function useSupplyTransferDetails(ids: string[]) {
  const normalizedIds = Array.from(new Set(ids.filter(Boolean)));

  const queries = useQueries({
    queries: normalizedIds.map((id) => ({
      queryKey: SUPPLY_TRANSFER_KEYS.detail(id),
      queryFn: async () => {
        const response = await supplyTransferService.getById(id);
        return response.data;
      },
      enabled: !!id,
    })),
  });

  const transferMap = new Map(
    queries
      .map((query, index) => [normalizedIds[index], query.data] as const)
      .filter(
        (entry): entry is [string, NonNullable<(typeof queries)[number]['data']>] => !!entry[1],
      ),
  );

  return {
    transferMap,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
  };
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

function createStatusMutation<TPayload>(
  mutationFn: (id: string, data: TPayload) => Promise<any>,
  successMessage: string,
) {
  return function useStatusMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: TPayload }) => mutationFn(id, data),
      onSuccess: (_, variables) => {
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.all });
        queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.detail(variables.id) });
      },
      onError: (error: any) => {
        handleHookError(error, 'Không thể cập nhật trạng thái phiếu chuyển hàng');
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

export function useReplaceSupplyTransferEvidenceUrls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReplaceSupplyTransferEvidenceUrlsPayload }) =>
      supplyTransferService.replaceEvidenceUrls(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã cập nhật danh sách bằng chứng');
      queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể cập nhật danh sách bằng chứng');
    },
  });
}

export function useAppendSupplyTransferEvidences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AppendSupplyTransferEvidencesPayload }) =>
      supplyTransferService.appendEvidences(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã thêm bằng chứng');
      queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể thêm bằng chứng');
    },
  });
}

export function useAddSupplyTransferDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateSupplyTransferDocumentPayload }) =>
      supplyTransferService.addDocument(id, data),
    onSuccess: (_, variables) => {
      toast.success('Đã thêm tài liệu phiếu chuyển');
      queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SUPPLY_TRANSFER_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      handleHookError(error, 'Không thể thêm tài liệu phiếu chuyển');
    },
  });
}
