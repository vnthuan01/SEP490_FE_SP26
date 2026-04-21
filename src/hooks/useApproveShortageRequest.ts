import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reliefDistributionService } from '@/services/reliefDistributionService';
import { handleHookError } from './hookErrorUtils';

export function useApproveShortageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      shortageRequestId,
      data,
    }: {
      campaignId: string;
      shortageRequestId: string;
      data: { reviewNote?: string; approvedItems?: any[] };
    }) => reliefDistributionService.approveShortageRequest(campaignId, shortageRequestId, data),
    onSuccess: (_, { campaignId }) => {
      toast.success('Đã duyệt yêu cầu thiếu hàng');
      queryClient.invalidateQueries({
        queryKey: ['relief-distribution', 'shortage-requests', campaignId],
      });
    },
    onError: (error) => handleHookError(error, 'Không thể duyệt yêu cầu'),
  });
}
