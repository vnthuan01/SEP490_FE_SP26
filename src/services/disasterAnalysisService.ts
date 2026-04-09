import { apiClient } from '@/lib/apiClients';

export interface AnalyzeDisasterRiskPayload {
  latitude: number;
  longitude: number;
  disasterType?: number;
  locationName?: string;
  additionalContext?: string;
  model?: string;
}

export interface AnalyzeDisasterRiskResponse {
  analysisLogId: string;
  latitude: number;
  longitude: number;
  locationName: string;
  analysisMode: string;
  requestedDisasterType?: string | null;
  primaryDisasterType: string;
  weather: {
    observedAt: string;
    condition: string;
    temperatureC: number;
    windKph: number;
    precipMm: number;
    visibilityKm: number;
    humidity: number;
    baseWeatherRiskScore: number;
    baseWeatherRiskLevel: string;
  };
  riskRanking: Array<{
    disasterType: string;
    riskScore: number;
    riskLevel: string;
    assessmentConfidence: string;
    triggerFactors: string[];
    topThreats: string[];
  }>;
  heuristic: {
    overallRiskScore: number;
    riskLevel: string;
    assessmentConfidence: string;
    dataLimitationNote?: string | null;
    triggerFactors: string[];
    potentialScenarios: string[];
    topThreats: string[];
  };
  ai: {
    succeeded: boolean;
    provider?: string | null;
    model?: string | null;
    promptVersion?: string | null;
    analyzedAt?: string | null;
    primaryRiskType?: string | null;
    summary?: string | null;
    detailedAnalysis?: string | null;
    recommendations: string[];
    potentialScenarios: string[];
    errorMessage?: string | null;
  };
}

export const disasterAnalysisService = {
  analyzeRisk: (data: AnalyzeDisasterRiskPayload) =>
    apiClient.post<AnalyzeDisasterRiskResponse>('/DisasterAnalysis/analyze', data),
};
