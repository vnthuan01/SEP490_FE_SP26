import { apiClient } from '@/lib/apiClients';

export interface PaginatedResponse<T> {
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalCount?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  items: T[];
}

export interface SupplyTransferItem {
  supplyItemId: string;
  quantity?: number;
  requestedQuantity?: number;
  actualQuantity?: number | null;
  supplyItemName?: string;
  notes?: string;
}

export interface CreateSupplyTransferPayload {
  sourceStationId: string;
  destinationStationId: string;
  reason: string;
  notes?: string;
  evidenceUrls?: string[];
  items: SupplyTransferItem[];
}

export interface SupplyTransfer {
  id: string;
  sourceStationId: string;
  sourceStationName?: string;
  transferCode: string;
  destinationStationId: string;
  destinationStationName?: string;
  totalRequestedItems?: number;
  requestedByName?: string;
  totalRequestedQuantity?: number;
  status: number;
  statusName?: string;
  reason?: string;
  notes?: string;
  evidenceUrls?: string[];
  items: SupplyTransferItem[];
  createdAt?: string;
}

type RawSupplyTransferItem = {
  supplyTransferItemId?: string;
  supplyItemId: string;
  supplyItemName?: string;
  requestedQuantity?: number;
  actualQuantity?: number | null;
  quantity?: number;
  notes?: string;
};

type RawSupplyTransfer = {
  id?: string;
  supplyTransferId?: string;
  transferCode?: string;
  sourceStationId?: string;
  sourceStationName?: string;
  destinationStationId?: string;
  destinationStationName?: string;
  status: number;
  statusName?: string;
  reason?: string;
  notes?: string;
  evidenceUrls?: string[];
  requestedAt?: string;
  createdAt?: string;
  requestedByName?: string;
  totalRequestedItems?: number;
  totalRequestedQuantity?: number;
  items?: RawSupplyTransferItem[];
};

type ApproveSupplyTransferPayload = {
  notes?: string;
  evidenceUrls?: string[];
};

type ShipSupplyTransferPayload = {
  vehicleId?: string;
  driverUserId?: string;
  notes?: string;
  evidenceUrls?: string[];
};

type ReceiveSupplyTransferPayload = {
  items: Array<{
    supplyItemId: string;
    actualQuantity: number;
    notes?: string;
  }>;
  notes?: string;
  evidenceUrls?: string[];
};

type CancelSupplyTransferPayload = {
  notes?: string;
  evidenceUrls?: string[];
};

function mapSupplyTransfer(raw: RawSupplyTransfer): SupplyTransfer {
  return {
    id: raw.id || raw.supplyTransferId || '',
    sourceStationId: raw.sourceStationId || '',
    sourceStationName: raw.sourceStationName,
    transferCode: raw.transferCode || raw.id || raw.supplyTransferId || '',
    destinationStationId: raw.destinationStationId || '',
    destinationStationName: raw.destinationStationName,
    totalRequestedItems: raw.totalRequestedItems ?? (raw.items || []).length ?? undefined,
    requestedByName: raw.requestedByName,
    totalRequestedQuantity:
      raw.totalRequestedQuantity ??
      (raw.items || []).reduce(
        (sum, item) => sum + Number(item.requestedQuantity ?? item.quantity ?? 0),
        0,
      ),
    status: Number(raw.status),
    statusName: raw.statusName,
    reason: raw.reason,
    notes: raw.notes,
    evidenceUrls: raw.evidenceUrls || [],
    createdAt: raw.createdAt || raw.requestedAt,
    items: (raw.items || []).map((item) => ({
      supplyItemId: item.supplyItemId,
      supplyItemName: item.supplyItemName,
      requestedQuantity: item.requestedQuantity ?? item.quantity ?? 0,
      actualQuantity: item.actualQuantity,
      quantity: item.requestedQuantity ?? item.quantity ?? 0,
      notes: item.notes,
    })),
  };
}

function mapSupplyTransfers(raw: RawSupplyTransfer[] | PaginatedResponse<RawSupplyTransfer>) {
  if (Array.isArray(raw)) return raw.map(mapSupplyTransfer);
  return {
    ...raw,
    items: (raw.items || []).map(mapSupplyTransfer),
  };
}

export interface SearchSupplyTransferByStatusParams {
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}

export const supplyTransferService = {
  create: (data: CreateSupplyTransferPayload) =>
    apiClient
      .post<RawSupplyTransfer>('/SupplyTransfer', data)
      .then((response) => ({ ...response, data: mapSupplyTransfer(response.data) })),

  getById: (id: string) =>
    apiClient
      .get<RawSupplyTransfer>(`/SupplyTransfer/${id}`)
      .then((response) => ({ ...response, data: mapSupplyTransfer(response.data) })),

  getByStatus: (params?: SearchSupplyTransferByStatusParams) =>
    apiClient
      .get<PaginatedResponse<RawSupplyTransfer> | RawSupplyTransfer[]>(
        '/SupplyTransfer/by-status',
        {
          params,
        },
      )
      .then((response) => ({ ...response, data: mapSupplyTransfers(response.data) })),

  getBySourceStation: (stationId: string) =>
    apiClient
      .get<RawSupplyTransfer[]>(`/SupplyTransfer/by-source-station/${stationId}`)
      .then((response) => ({ ...response, data: response.data.map(mapSupplyTransfer) })),

  getByDestinationStation: (stationId: string) =>
    apiClient
      .get<RawSupplyTransfer[]>(`/SupplyTransfer/by-destination-station/${stationId}`)
      .then((response) => ({ ...response, data: response.data.map(mapSupplyTransfer) })),

  approve: (id: string, data?: ApproveSupplyTransferPayload) =>
    apiClient.patch(`/SupplyTransfer/${id}/approve`, data ?? {}),

  ship: (id: string, data?: ShipSupplyTransferPayload) =>
    apiClient.patch(`/SupplyTransfer/${id}/ship`, data ?? {}),

  receive: (id: string, data: ReceiveSupplyTransferPayload) =>
    apiClient.patch(`/SupplyTransfer/${id}/receive`, data),

  cancel: (id: string, data?: CancelSupplyTransferPayload) =>
    apiClient.patch(`/SupplyTransfer/${id}/cancel`, data ?? {}),
};
