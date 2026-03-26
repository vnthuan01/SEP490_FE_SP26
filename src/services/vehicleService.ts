import { apiClient } from '@/lib/apiClients';

export interface Vehicle {
  vehicleId: string;
  vehicleTypeId: string;
  vehicleTypeName?: string;
  licensePlate: string;
  createdBy?: string;
  creatorName?: string;
  teamUsed: string;
  status: number;
  statusName?: string;
  createdAt?: string;
  updatedAt?: string;
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
  pageIndex?: number;
  pageSize?: number;
}

export interface SearchVehicleTypeParams {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface CreateVehiclePayload {
  vehicleTypeId: string;
  licensePlate: string;
  teamUsed: string;
}

export interface UpdateVehiclePayload {
  vehicleTypeId: string;
  licensePlate: string;
  teamUsed: string;
  status: number;
}

// === Vehicle Type Models ===
export interface VehicleType {
  id: string; // adjust if it uses a different primary key name
  typeName: string;
  defaultCapacity: number;
  description: string;
}

export interface CreateVehicleTypePayload {
  typeName: string;
  defaultCapacity: number;
  description: string;
}

export type UpdateVehicleTypePayload = CreateVehicleTypePayload;

export const vehicleService = {
  // Get all vehicles
  getAll: (params?: SearchVehicleParams) =>
    apiClient.get<PaginatedResponse<Vehicle>>('/Vehicle', { params }),

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

  // === Vehicle Type APIs ===
  getTypes: (params?: SearchVehicleTypeParams) =>
    apiClient.get<PaginatedResponse<VehicleType>>('/VehicleType', { params }),

  getTypeById: (id: string) => apiClient.get<VehicleType>(`/VehicleType/${id}`),

  createType: (data: CreateVehicleTypePayload) => apiClient.post<VehicleType>('/VehicleType', data),

  updateType: (id: string, data: UpdateVehicleTypePayload) =>
    apiClient.put(`/VehicleType/${id}`, data),

  deleteType: (id: string) => apiClient.delete(`/VehicleType/${id}`),
};
