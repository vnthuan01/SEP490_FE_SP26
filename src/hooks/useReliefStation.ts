import { useQuery } from '@tanstack/react-query';
import { reliefStationService } from '@/services/reliefStationService';

export const RELIEF_STATION_QUERY_KEYS = {
  myStation: ['relief-station', 'my-station'] as const,
};

export function useMyReliefStation() {
  const {
    data: station,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: RELIEF_STATION_QUERY_KEYS.myStation,
    queryFn: async () => {
      const response = await reliefStationService.getCurrentModeratorStation();
      return response.data;
    },
  });

  return {
    station,
    isLoading,
    isError,
    error,
    refetch,
  };
}
