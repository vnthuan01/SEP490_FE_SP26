import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { volunteerProfileService } from '@/services/volunteerProfileService';

export const VOLUNTEER_REVIEW_QUERY_KEYS = {
  all: ['volunteer-review-applications'] as const,
};

export function useVolunteerReviewApplications() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: VOLUNTEER_REVIEW_QUERY_KEYS.all,
    queryFn: async () => {
      const res = await volunteerProfileService.getReviewApplications();
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => volunteerProfileService.approveApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_REVIEW_QUERY_KEYS.all });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      volunteerProfileService.rejectApplication(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOLUNTEER_REVIEW_QUERY_KEYS.all });
    },
  });

  return {
    applications: data?.items || [],
    paging: data,
    isLoading,
    isError,
    refetch,
    approveApplication: approveMutation.mutateAsync,
    approveStatus: approveMutation.status,
    rejectApplication: rejectMutation.mutateAsync,
    rejectStatus: rejectMutation.status,
  };
}
