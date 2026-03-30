import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillsService } from '@/services/skillsService';
import type { CreateSkillPayload, UpdateSkillPayload } from '@/services/skillsService';

export const SKILL_QUERY_KEYS = {
  all: ['skills'] as const,
  detail: (id: string) => ['skills', id] as const,
};

export function useSkills(id?: string) {
  const queryClient = useQueryClient();

  const {
    data: skills,
    isLoading: isLoadingSkills,
    isError: isErrorSkills,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: SKILL_QUERY_KEYS.all,
    queryFn: async () => {
      const response = await skillsService.getAll();
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
    skills: skills || [],
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
