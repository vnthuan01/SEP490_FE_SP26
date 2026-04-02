import { apiClient } from '@/lib/apiClients';

export interface FundSourceCampaign {
  campaignId?: string;
  campaignName?: string;
  amount?: number;
}

export interface FundSummary {
  fundId: string;
  name: string;
  totalBalance: number;
  totalContributionCount: number;
  totalSourceCampaigns: number;
  sources: FundSourceCampaign[];
}

export interface FundContribution {
  contributionId?: string;
  amount?: number;
  donorName?: string;
  campaignId?: string;
  campaignName?: string;
  createdAt?: string;
  note?: string;
}

export interface FundTransaction {
  transactionId?: string;
  type?: string;
  amount?: number;
  note?: string;
  createdAt?: string;
  createdBy?: string;
}

export const fundService = {
  getSummary: () => apiClient.get<FundSummary>('/funds/summary'),
  getContributions: () => apiClient.get<FundContribution[]>('/funds/contributions'),
  getTransactions: () => apiClient.get<FundTransaction[]>('/funds/transactions'),
};
