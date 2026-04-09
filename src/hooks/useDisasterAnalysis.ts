import { useQueries } from '@tanstack/react-query';
import {
  disasterAnalysisService,
  type AnalyzeDisasterRiskPayload,
  type AnalyzeDisasterRiskResponse,
} from '@/services/disasterAnalysisService';

export const DISASTER_ANALYSIS_QUERY_KEYS = {
  all: ['disaster-analysis'] as const,
  analyze: (payload: AnalyzeDisasterRiskPayload) =>
    ['disaster-analysis', 'analyze', payload] as const,
};

export function useAnalyzeDisasterRisks(payloads: AnalyzeDisasterRiskPayload[]) {
  const queries = useQueries({
    queries: payloads.map((payload) => ({
      queryKey: DISASTER_ANALYSIS_QUERY_KEYS.analyze(payload),
      queryFn: async () => {
        const response = await disasterAnalysisService.analyzeRisk(payload);
        return response.data as AnalyzeDisasterRiskResponse;
      },
      enabled:
        Number.isFinite(payload.latitude) &&
        Number.isFinite(payload.longitude) &&
        !(payload.latitude === 0 && payload.longitude === 0),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  return {
    queries,
    analyses: queries.map((query) => query.data).filter(Boolean) as AnalyzeDisasterRiskResponse[],
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  };
}
