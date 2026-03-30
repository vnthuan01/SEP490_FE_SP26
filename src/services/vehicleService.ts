import { apiClient } from '@/lib/apiClients';

// Interfaces for Vehicle Models
export interface Vehicle {
  vehicleId: string;
  vehicleTypeId: string;
  licensePlate: string;
  teamUsed: string;
  status: number;
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
  getAll: () => apiClient.get<Vehicle[]>('/Vehicle'),

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
  getTypes: () => apiClient.get<VehicleType[]>('/VehicleType'),

  getTypeById: (id: string) => apiClient.get<VehicleType>(`/VehicleType/${id}`),

  createType: (data: CreateVehicleTypePayload) => apiClient.post<VehicleType>('/VehicleType', data),

  updateType: (id: string, data: UpdateVehicleTypePayload) =>
    apiClient.put(`/VehicleType/${id}`, data),

  deleteType: (id: string) => apiClient.delete(`/VehicleType/${id}`),
};
