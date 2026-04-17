import { apiClient } from '@/lib/apiClients';

export interface Vehicle {
  vehicleId: string;
  vehicleTypeId: string;
  vehicleTypeName?: string;
  licensePlate: string;
  createdBy?: string;
  creatorName?: string;
  reliefStationId?: string;
  reliefStationName?: string;
  teamId?: string;
  teamName?: string;
  teamUsed?: string;
  status: number;
  statusName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleCounts {
  total: number;
  free: number;
  busy: number;
  unassignedStation: number;
}

export interface PaginatedResponse<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export interface SearchVehicleParams {
  search?: string;
  reliefStationId?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface SearchVehicleTypeParams {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export type VehicleCapacityKind = 1 | 2;

export interface CreateVehiclePayload {
  vehicleTypeId: string;
  licensePlate: string;
  reliefStationId?: string;
  teamId?: string;
}

export interface UpdateVehiclePayload {
  vehicleTypeId: string;
  licensePlate: string;
  teamId?: string;
  status: number;
}

export const normalizeVehicle = (item: any): Vehicle => ({
  vehicleId: item?.vehicleId || '',
  vehicleTypeId: item?.vehicleTypeId || '',
  vehicleTypeName: item?.vehicleTypeName || '',
  licensePlate: String(item?.licensePlate || '').toUpperCase(),
  createdBy: item?.createdBy,
  creatorName: item?.creatorName,
  reliefStationId: item?.reliefStationId,
  reliefStationName: item?.reliefStationName,
  teamId: item?.teamId,
  teamName: item?.teamName || item?.teamUsed || '',
  teamUsed: item?.teamUsed || item?.teamName || '',
  status: Number(item?.status || 0),
  statusName: item?.statusName,
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

export const normalizeVehiclePage = (
  response: PaginatedResponse<any>,
): PaginatedResponse<Vehicle> => ({
  ...response,
  items: Array.isArray(response?.items) ? response.items.map(normalizeVehicle) : [],
});

// === Vehicle Type Models ===
export interface VehicleType {
  id: string;
  vehicleTypeId?: string;
  typeName: string;
  defaultCapacity: number;
  capacityKind: VehicleCapacityKind;
  capacityKindName?: string;
  capacityUnit: 'kg' | 'people';
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateVehicleTypePayload {
  typeName: string;
  defaultCapacity: number;
  capacityKind: VehicleCapacityKind;
  capacityUnit: 'kg' | 'people';
  description: string;
}

export type UpdateVehicleTypePayload = CreateVehicleTypePayload;

export const normalizeVehicleType = (item: any): VehicleType => ({
  ...(() => {
    const rawKind = Number(item?.capacityKind || 0);
    const capacityKind: VehicleCapacityKind = rawKind === 2 ? 2 : 1;
    const rawUnit = String(item?.capacityUnit || '')
      .trim()
      .toLowerCase();
    const fallbackUnit = capacityKind === 1 ? 'kg' : 'people';
    const capacityUnit = (rawUnit === 'kg' || rawUnit === 'people' ? rawUnit : fallbackUnit) as
      | 'kg'
      | 'people';

    return {
      capacityKind,
      capacityUnit,
    };
  })(),
  ...item,
  id: item?.id || item?.vehicleTypeId || '',
  vehicleTypeId: item?.vehicleTypeId || item?.id || '',
  typeName: item?.typeName || '',
  defaultCapacity: Number(item?.defaultCapacity || 0),
  capacityKindName: item?.capacityKindName,
  description: item?.description || '',
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

export const normalizeVehicleTypePage = (
  response: PaginatedResponse<any>,
): PaginatedResponse<VehicleType> => ({
  ...response,
  items: Array.isArray(response?.items) ? response.items.map(normalizeVehicleType) : [],
});

export const vehicleService = {
  // Get all vehicles
  getAll: (params?: SearchVehicleParams) =>
    apiClient.get<PaginatedResponse<Vehicle>>('/Vehicle', { params }),

  // Get vehicle counts (manager only)
  getCounts: (stationId?: string) =>
    apiClient.get<VehicleCounts>('/Vehicle/counts', {
      params: stationId ? { stationId } : undefined,
    }),

  // Get vehicle by id
  getById: (id: string) => apiClient.get<Vehicle>(`/Vehicle/${id}`),

  // Create new vehicle
  create: (data: CreateVehiclePayload) => apiClient.post<Vehicle>('/Vehicle', data),

  // Update existing vehicle
  update: (id: string, data: UpdateVehiclePayload) => apiClient.put(`/Vehicle/${id}`, data),

  // Delete vehicle
  delete: (id: string) => apiClient.delete(`/Vehicle/${id}`),

  // Get vehicles by status
  getByStatus: (status: number) => apiClient.get<Vehicle[]>(`/Vehicle/status/${status}`),

  // Get my vehicles
  getMyVehicles: () => apiClient.get<Vehicle[]>('/Vehicle/my-vehicles'),

  // Assign vehicle to station (manager only)
  assignStation: (id: string, stationId: string) =>
    apiClient.put<Vehicle>(`/Vehicle/${id}/assign-station/${stationId}`),

  // Assign vehicle to team (moderator only)
  assignTeam: (id: string, teamId: string) =>
    apiClient.put<Vehicle>(`/Vehicle/${id}/assign-team/${teamId}`),

  // === Vehicle Type APIs ===
  getTypes: (params?: SearchVehicleTypeParams) =>
    apiClient.get<PaginatedResponse<VehicleType>>('/VehicleType', { params }),

  getTypeById: (id: string) => apiClient.get<VehicleType>(`/VehicleType/${id}`),

  createType: (data: CreateVehicleTypePayload) => apiClient.post<VehicleType>('/VehicleType', data),

  updateType: (id: string, data: UpdateVehicleTypePayload) =>
    apiClient.put(`/VehicleType/${id}`, data),

  deleteType: (id: string) => apiClient.delete(`/VehicleType/${id}`),
};
