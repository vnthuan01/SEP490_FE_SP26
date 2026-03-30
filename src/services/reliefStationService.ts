import { apiClient } from '@/lib/apiClients';

export interface ReliefStationResponse {
  reliefStationId: string;
  name: string;
  address: string | null;
  moderatorName: string | null;
  contactNumber: string | null;
  longitude: number;
  latitude: number;
  status: number;
  level: number;
  locationId: string;
  locationName: string;
  createdAt: string;
  updatedAt: string | null;
}

export const reliefStationService = {
  getCurrentModeratorStation: () =>
    apiClient.get<ReliefStationResponse>('/relief-stations/my-station'),
};
