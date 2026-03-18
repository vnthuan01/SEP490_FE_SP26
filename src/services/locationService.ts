import { apiClient } from '@/lib/apiClients';

export interface LocationNode {
  id: string;
  name: string;
  fullName: string;
  path: string;
  level: number;
}

export interface LocationTree extends LocationNode {
  children?: LocationTree[];
}

export const locationService = {
  getRegions: () => apiClient.get<LocationNode[]>('/Location/regions'),

  getProvinces: () => apiClient.get<LocationNode[]>('/Location/provinces'),

  getTree: () => apiClient.get<LocationTree[]>('/Location/tree'),

  search: (path: string) => apiClient.get<LocationNode[]>('/Location/search', { params: { path } }),
};
