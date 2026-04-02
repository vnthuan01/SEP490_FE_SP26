import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  transferEvidenceService,
  type PrepareTransferEvidencePayload,
} from '@/services/transferEvidenceService';
import { toast } from 'sonner';
import { handleHookError } from './hookErrorUtils';

export const TRANSFER_EVIDENCE_KEYS = {
  all: ['transfer-evidence'] as const,
  byTransfer: (transferId: string) => ['transfer-evidence', 'transfer', transferId] as const,
  byTransaction: (transactionId: string) =>
    ['transfer-evidence', 'transaction', transactionId] as const,
};

export function usePrepareTransferEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PrepareTransferEvidencePayload) =>
      transferEvidenceService.prepareLocalEvidence(payload),
    onSuccess: (records) => {
      toast.success('Đã chuẩn bị hồ sơ chứng cứ trên FE');
      records.forEach((record) => {
        if (record.transferId) {
          queryClient.invalidateQueries({
            queryKey: TRANSFER_EVIDENCE_KEYS.byTransfer(record.transferId),
          });
        }
        if (record.transactionId) {
          queryClient.invalidateQueries({
            queryKey: TRANSFER_EVIDENCE_KEYS.byTransaction(record.transactionId),
          });
        }
      });
    },
    onError: (error) => {
      handleHookError(error, 'Không thể chuẩn bị hồ sơ chứng cứ');
    },
  });
}

export function useTransferEvidenceByTransfer(transferId: string) {
  return useQuery({
    queryKey: TRANSFER_EVIDENCE_KEYS.byTransfer(transferId),
    queryFn: () => transferEvidenceService.getByTransferId(transferId),
    enabled: !!transferId,
  });
}

export function useTransferEvidenceByTransaction(transactionId: string) {
  return useQuery({
    queryKey: TRANSFER_EVIDENCE_KEYS.byTransaction(transactionId),
    queryFn: () => transferEvidenceService.getByTransactionId(transactionId),
    enabled: !!transactionId,
  });
}
