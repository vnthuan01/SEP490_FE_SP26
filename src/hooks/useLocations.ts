import { useQuery } from '@tanstack/react-query';
import { locationService } from '@/services/locationService';

export const LOCATION_KEYS = {
  all: ['locations'] as const,
  regions: () => [...LOCATION_KEYS.all, 'regions'] as const,
  provinces: () => [...LOCATION_KEYS.all, 'provinces'] as const,
  tree: () => [...LOCATION_KEYS.all, 'tree'] as const,
  search: (path: string) => [...LOCATION_KEYS.all, 'search', path] as const,
};

export const useRegions = () => {
  return useQuery({
    queryKey: LOCATION_KEYS.regions(),
    queryFn: async () => {
      const response = await locationService.getRegions();
      return response.data;
    },
  });
};

export const useProvinces = () => {
  return useQuery({
    queryKey: LOCATION_KEYS.provinces(),
    queryFn: async () => {
      const response = await locationService.getProvinces();
      return response.data;
    },
  });
};

export const useLocationTree = () => {
  return useQuery({
    queryKey: LOCATION_KEYS.tree(),
    queryFn: async () => {
      const response = await locationService.getTree();
      return response.data;
    },
  });
};

export const useSearchLocations = (path: string) => {
  return useQuery({
    queryKey: LOCATION_KEYS.search(path),
    queryFn: async () => {
      const response = await locationService.search(path);
      return response.data;
    },
    enabled: !!path, // Only run the query if a path string is provided
  });
};
