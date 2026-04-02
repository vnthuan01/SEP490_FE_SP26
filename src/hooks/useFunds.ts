import { useQuery } from '@tanstack/react-query';
import { fundService } from '@/services/fundService';

export const FUND_QUERY_KEYS = {
  summary: ['funds', 'summary'] as const,
  contributions: ['funds', 'contributions'] as const,
  transactions: ['funds', 'transactions'] as const,
};

export function useFundSummary() {
  return useQuery({
    queryKey: FUND_QUERY_KEYS.summary,
    queryFn: async () => {
      const response = await fundService.getSummary();
      return response.data;
    },
  });
}

export function useFundContributions() {
  return useQuery({
    queryKey: FUND_QUERY_KEYS.contributions,
    queryFn: async () => {
      const response = await fundService.getContributions();
      return response.data;
    },
  });
}

export function useFundTransactions() {
  return useQuery({
    queryKey: FUND_QUERY_KEYS.transactions,
    queryFn: async () => {
      const response = await fundService.getTransactions();
      return response.data;
    },
  });
}
