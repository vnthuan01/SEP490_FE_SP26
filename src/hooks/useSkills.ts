import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillsService } from '@/services/skillsService';
import type {
  CreateSkillPayload,
  UpdateSkillPayload,
  SearchSkillParams,
} from '@/services/skillsService';

export const SKILL_QUERY_KEYS = {
  all: ['skills'] as const,
  list: (params?: SearchSkillParams) => [...SKILL_QUERY_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...SKILL_QUERY_KEYS.all, 'detail', id] as const,
};

export function useSkills(id?: string, params?: SearchSkillParams) {
  const queryClient = useQueryClient();

  const {
    data: skillsData,
    isLoading: isLoadingSkills,
    isError: isErrorSkills,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: SKILL_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await skillsService.getAll(params);
      return response.data;
    },
  });

  const {
    data: skill,
    isLoading: isLoadingSkill,
    isError: isErrorSkill,
    refetch: refetchSkill,
  } = useQuery({
    queryKey: id ? SKILL_QUERY_KEYS.detail(id) : [],
    queryFn: async () => {
      if (!id) throw new Error('Skill ID is required');
      const response = await skillsService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });

  const createSkillMutation = useMutation({
    mutationFn: (data: CreateSkillPayload) => skillsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.all });
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSkillPayload }) =>
      skillsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.detail(variables.id) });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (id: string) => skillsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.all });
    },
  });

  return {
    // List Methods
    skills: skillsData?.items || [],
    skillsPagination: skillsData
      ? {
          currentPage: skillsData.currentPage,
          totalPages: skillsData.totalPages,
          pageSize: skillsData.pageSize,
          totalCount: skillsData.totalCount,
          hasPrevious: skillsData.hasPrevious,
          hasNext: skillsData.hasNext,
        }
      : null,
    isLoadingSkills,
    isErrorSkills,
    refetchSkills,

    // Detail Methods
    skill,
    isLoadingSkill,
    isErrorSkill,
    refetchSkill,

    // Mutations
    createSkill: createSkillMutation.mutateAsync,
    createStatus: createSkillMutation.status,
    updateSkill: updateSkillMutation.mutateAsync,
    updateStatus: updateSkillMutation.status,
    deleteSkill: deleteSkillMutation.mutateAsync,
    deleteStatus: deleteSkillMutation.status,
  };
}
