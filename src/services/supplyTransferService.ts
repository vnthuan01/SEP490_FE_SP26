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
  supplyTransferItemId?: string;
  supplyItemId: string;
  quantity?: number;
  requestedQuantity?: number;
  actualQuantity?: number | null;
  supplyItemName?: string;
  notes?: string;
  unitCost?: number;
  expiryDate?: string | null;
  sourceReference?: string;
  totalAmount?: number;
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
  requestedAt?: string;
  items: SupplyTransferItem[];
  createdAt?: string;
  approvedAt?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;
  requestedBy?: string;
  approvedBy?: string | null;
  approvedByName?: string | null;
  vehicleId?: string | null;
  driverUserId?: string | null;
  currentRequestPdfUrl?: string | null;
  currentConfirmedPdfUrl?: string | null;
  documents?: SupplyTransferDocument[];
  inventoryTransactionIds?: string[];
}

export interface SupplyTransferDocument {
  supplyTransferDocumentId: string;
  documentType: number;
  version: number;
  fileUrl: string;
  fileName?: string | null;
  contentType?: string | null;
  fileSizeBytes?: number | null;
  isCurrent: boolean;
  createdBy?: string | null;
  createdAt: string;
  notes?: string | null;
}

type RawSupplyTransferItem = {
  supplyTransferItemId?: string;
  supplyItemId: string;
  supplyItemName?: string;
  requestedQuantity?: number;
  actualQuantity?: number | null;
  quantity?: number;
  notes?: string;
  unitCost?: number;
  expiryDate?: string | null;
  sourceReference?: string;
  totalAmount?: number;
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
  approvedAt?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;
  requestedBy?: string;
  requestedByName?: string;
  approvedBy?: string | null;
  approvedByName?: string | null;
  vehicleId?: string | null;
  driverUserId?: string | null;
  totalRequestedItems?: number;
  totalRequestedQuantity?: number;
  currentRequestPdfUrl?: string | null;
  currentConfirmedPdfUrl?: string | null;
  documents?: RawSupplyTransferDocument[];
  inventoryTransactionIds?: string[];
  items?: RawSupplyTransferItem[];
};

type RawSupplyTransferDocument = {
  supplyTransferDocumentId?: string;
  documentType?: number;
  version?: number;
  fileUrl?: string;
  fileName?: string | null;
  contentType?: string | null;
  fileSizeBytes?: number | null;
  isCurrent?: boolean;
  createdBy?: string | null;
  createdAt?: string;
  notes?: string | null;
};

type ApproveSupplyTransferPayload = {
  notes?: string;
  evidenceUrls?: string[];
};

export type ShipSupplyTransferPayload = {
  vehicleId: string;
  notes?: string;
  evidenceUrls?: string[];
};

export type ReceiveSupplyTransferPayload = {
  items: Array<{
    supplyItemId: string;
    actualQuantity: number;
    notes?: string;
    unitCost?: number;
    expiryDate?: string | null;
    sourceReference?: string;
  }>;
  notes?: string;
  evidenceUrls?: string[];
};

export type CancelSupplyTransferPayload = {
  notes?: string;
  evidenceUrls?: string[];
};

export interface ReplaceSupplyTransferEvidenceUrlsPayload {
  evidenceUrls: string[];
}

export interface AppendSupplyTransferEvidencesPayload {
  evidenceUrls: string[];
}

function mapSupplyTransferDocument(raw: RawSupplyTransferDocument): SupplyTransferDocument {
  return {
    supplyTransferDocumentId: raw.supplyTransferDocumentId || '',
    documentType: Number(raw.documentType || 0),
    version: Number(raw.version || 0),
    fileUrl: raw.fileUrl || '',
    fileName: raw.fileName ?? null,
    contentType: raw.contentType ?? null,
    fileSizeBytes: raw.fileSizeBytes ?? null,
    isCurrent: Boolean(raw.isCurrent),
    createdBy: raw.createdBy ?? null,
    createdAt: raw.createdAt || '',
    notes: raw.notes ?? null,
  };
}

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
    requestedAt: raw.requestedAt || raw.createdAt,
    createdAt: raw.createdAt || raw.requestedAt,
    approvedAt: raw.approvedAt ?? null,
    shippedAt: raw.shippedAt ?? null,
    receivedAt: raw.receivedAt ?? null,
    requestedBy: raw.requestedBy,
    items: (raw.items || []).map((item) => ({
      supplyTransferItemId: item.supplyTransferItemId,
      supplyItemId: item.supplyItemId,
      supplyItemName: item.supplyItemName,
      requestedQuantity: item.requestedQuantity ?? item.quantity ?? 0,
      actualQuantity: item.actualQuantity,
      quantity: item.requestedQuantity ?? item.quantity ?? 0,
      notes: item.notes,
      unitCost: item.unitCost != null ? Number(item.unitCost) : undefined,
      expiryDate: item.expiryDate ?? null,
      sourceReference: item.sourceReference,
      totalAmount: item.totalAmount != null ? Number(item.totalAmount) : undefined,
    })),
    approvedBy: raw.approvedBy ?? null,
    approvedByName: raw.approvedByName ?? null,
    vehicleId: raw.vehicleId ?? null,
    driverUserId: raw.driverUserId ?? null,
    currentRequestPdfUrl: raw.currentRequestPdfUrl ?? null,
    currentConfirmedPdfUrl: raw.currentConfirmedPdfUrl ?? null,
    documents: (raw.documents || []).map(mapSupplyTransferDocument),
    inventoryTransactionIds: raw.inventoryTransactionIds || [],
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

  replaceEvidenceUrls: (id: string, data: ReplaceSupplyTransferEvidenceUrlsPayload) =>
    apiClient.put(`/SupplyTransfer/${id}/evidence-urls`, data),

  appendEvidences: (id: string, data: AppendSupplyTransferEvidencesPayload) =>
    apiClient.post(`/SupplyTransfer/${id}/evidences`, data),
};
