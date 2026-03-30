import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleService } from '@/services/vehicleService';
import type {
  CreateVehiclePayload,
  UpdateVehiclePayload,
  CreateVehicleTypePayload,
  UpdateVehicleTypePayload,
  SearchVehicleParams,
  SearchVehicleTypeParams,
} from '@/services/vehicleService';

export const VEHICLE_QUERY_KEYS = {
  all: ['vehicles'] as const,
  list: (params?: SearchVehicleParams) => ['vehicles', 'list', params] as const,
  detail: (id: string) => ['vehicles', id] as const,
  byStatus: (status: number) => ['vehicles', 'status', status] as const,
  myVehicles: ['vehicles', 'my-vehicles'] as const,
};

export const VEHICLE_TYPE_QUERY_KEYS = {
  all: ['vehicleTypes'] as const,
  list: (params?: SearchVehicleTypeParams) => ['vehicleTypes', 'list', params] as const,
  detail: (id: string) => ['vehicleTypes', id] as const,
};

export function useVehicles(id?: string, status?: number, params?: SearchVehicleParams) {
  const queryClient = useQueryClient();

  // Query: List all vehicles
  const {
    data: vehiclesData,
    isLoading: isLoadingVehicles,
    isError: isErrorVehicles,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: VEHICLE_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await vehicleService.getAll(params);
      return response.data;
    },
  });

  // Query: Detail vehicle
  const {
    data: vehicle,
    isLoading: isLoadingVehicle,
    isError: isErrorVehicle,
    refetch: refetchVehicle,
  } = useQuery({
    queryKey: id ? VEHICLE_QUERY_KEYS.detail(id) : [],
    queryFn: async () => {
      if (!id) throw new Error('Vehicle ID is required');
      const response = await vehicleService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });

  // Query: Vehicles by status
  const {
    data: vehiclesByStatus,
    isLoading: isLoadingVehiclesByStatus,
    isError: isErrorVehiclesByStatus,
    refetch: refetchVehiclesByStatus,
  } = useQuery({
    queryKey: status !== undefined ? VEHICLE_QUERY_KEYS.byStatus(status) : [],
    queryFn: async () => {
      if (status === undefined) throw new Error('Status is required');
      const response = await vehicleService.getByStatus(status);
      return response.data;
    },
    enabled: status !== undefined,
  });

  // Query: My vehicles
  const {
    data: myVehicles,
    isLoading: isLoadingMyVehicles,
    isError: isErrorMyVehicles,
    refetch: refetchMyVehicles,
  } = useQuery({
    queryKey: VEHICLE_QUERY_KEYS.myVehicles,
    queryFn: async () => {
      const response = await vehicleService.getMyVehicles();
      return response.data;
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data: CreateVehiclePayload) => vehicleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.myVehicles });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehiclePayload }) =>
      vehicleService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.myVehicles });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => vehicleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: VEHICLE_QUERY_KEYS.myVehicles });
    },
  });

  return {
    // List specific
    vehicles: vehiclesData?.items || [],
    vehiclesPagination: vehiclesData
      ? {
          currentPage: vehiclesData.currentPage,
          totalPages: vehiclesData.totalPages,
          pageSize: vehiclesData.pageSize,
          totalCount: vehiclesData.totalCount,
          hasPrevious: vehiclesData.hasPrevious,
          hasNext: vehiclesData.hasNext,
        }
      : null,
    isLoadingVehicles,
    isErrorVehicles,
    refetchVehicles,

    // Detail specific
    vehicle,
    isLoadingVehicle,
    isErrorVehicle,
    refetchVehicle,

    // Status specific
    vehiclesByStatus: vehiclesByStatus || [],
    isLoadingVehiclesByStatus,
    isErrorVehiclesByStatus,
    refetchVehiclesByStatus,

    // My vehicles specific
    myVehicles: myVehicles || [],
    isLoadingMyVehicles,
    isErrorMyVehicles,
    refetchMyVehicles,

    // Mutations
    createVehicle: createVehicleMutation.mutateAsync,
    createStatus: createVehicleMutation.status,

    updateVehicle: updateVehicleMutation.mutateAsync,
    updateStatus: updateVehicleMutation.status,

    deleteVehicle: deleteVehicleMutation.mutateAsync,
    deleteStatus: deleteVehicleMutation.status,
  };
}

export function useVehicleTypes(id?: string, params?: SearchVehicleTypeParams) {
  const queryClient = useQueryClient();

  // Query: List all vehicle types
  const {
    data: vehicleTypesData,
    isLoading: isLoadingVehicleTypes,
    isError: isErrorVehicleTypes,
    refetch: refetchVehicleTypes,
  } = useQuery({
    queryKey: VEHICLE_TYPE_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await vehicleService.getTypes(params);
      return response.data;
    },
  });

  // Query: Detail vehicle type
  const {
    data: vehicleType,
    isLoading: isLoadingVehicleType,
    isError: isErrorVehicleType,
    refetch: refetchVehicleType,
  } = useQuery({
    queryKey: id ? VEHICLE_TYPE_QUERY_KEYS.detail(id) : [],
    queryFn: async () => {
      if (!id) throw new Error('Vehicle Type ID is required');
      const response = await vehicleService.getTypeById(id);
      return response.data;
    },
    enabled: !!id,
  });

  const createVehicleTypeMutation = useMutation({
    mutationFn: (data: CreateVehicleTypePayload) => vehicleService.createType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_TYPE_QUERY_KEYS.all });
    },
  });

  const updateVehicleTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleTypePayload }) =>
      vehicleService.updateType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_TYPE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: VEHICLE_TYPE_QUERY_KEYS.detail(variables.id) });
    },
  });

  const deleteVehicleTypeMutation = useMutation({
    mutationFn: (id: string) => vehicleService.deleteType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VEHICLE_TYPE_QUERY_KEYS.all });
    },
  });

  return {
    // List specific
    vehicleTypes: vehicleTypesData?.items || [],
    vehicleTypesPagination: vehicleTypesData
      ? {
          currentPage: vehicleTypesData.currentPage,
          totalPages: vehicleTypesData.totalPages,
          pageSize: vehicleTypesData.pageSize,
          totalCount: vehicleTypesData.totalCount,
          hasPrevious: vehicleTypesData.hasPrevious,
          hasNext: vehicleTypesData.hasNext,
        }
      : null,
    isLoadingVehicleTypes,
    isErrorVehicleTypes,
    refetchVehicleTypes,

    // Detail specific
    vehicleType,
    isLoadingVehicleType,
    isErrorVehicleType,
    refetchVehicleType,

    // Mutations
    createVehicleType: createVehicleTypeMutation.mutateAsync,
    createTypeStatus: createVehicleTypeMutation.status,

    updateVehicleType: updateVehicleTypeMutation.mutateAsync,
    updateTypeStatus: updateVehicleTypeMutation.status,

    deleteVehicleType: deleteVehicleTypeMutation.mutateAsync,
    deleteTypeStatus: deleteVehicleTypeMutation.status,
  };
}
