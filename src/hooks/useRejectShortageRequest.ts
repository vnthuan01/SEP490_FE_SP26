import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reliefDistributionService } from '@/services/reliefDistributionService';
import { handleHookError } from './hookErrorUtils';

export function useRejectShortageRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      shortageRequestId,
      data,
    }: {
      campaignId: string;
      shortageRequestId: string;
      data: { reviewNote?: string };
    }) => reliefDistributionService.rejectShortageRequest(campaignId, shortageRequestId, data),
    onSuccess: (_, { campaignId }) => {
      toast.success('Đã từ chối yêu cầu thiếu hàng');
      queryClient.invalidateQueries({
        queryKey: ['relief-distribution', 'shortage-requests', campaignId],
      });
    },
    onError: (error) => handleHookError(error, 'Không thể từ chối yêu cầu'),
  });
}
