import { apiClient } from '@/lib/apiClients';

export interface RescueOperationItem {
  rescueOperationId?: string;
  stationName?: string | null;
  startedAt?: string | null;
  [key: string]: unknown;
}

export interface RescueAttachmentItem {
  attachmentId?: string;
  fileUrl?: string | null;
  contentType?: string | null;
  attachmentType?: number | string | null;
  uploadedAt?: string | null;
}

export interface RequestVerificationItem {
  requestVerificationId?: string;
  status?: number | string | null;
  method?: number | null;
  note?: string | null;
  reason?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  [key: string]: unknown;
}

export interface RescueRequestItem {
  requestId?: string;
  rescueRequestId?: string;
  id?: string;
  disasterType?: string | null;
  rescueRequestType?: string | number | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  reporterFullName?: string | null;
  reporterPhone?: string | null;
  priority?: number | null;
  rescueRequestStatus?: string | number | null;
  dispatchMode?: string | null;
  note?: string | null;
  stationToRequestDistanceKm?: number | null;
  stationToRequestDurationMinutes?: number | null;
  stationToRequestDistanceMeters?: number | null;
  stationToRequestDurationSeconds?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  attachments?: RescueAttachmentItem[];
  rescueOperations?: RescueOperationItem[];
  verifications?: RequestVerificationItem[];
  [key: string]: unknown;
}

export interface VerifyRescueRequestPayload {
  status: number;
  method: number;
  note?: string;
  reason?: string;
}

export interface RejectRescueRequestPayload {
  method: number;
  reason: string;
  note?: string;
}

export interface AssignTeamPayload {
  teamId: string;
  note?: string;
}

export interface AssignTeamBulkPayload {
  teamId: string;
  requestIds: string[];
  note?: string;
}

export interface RescueRequestPaging {
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalCount?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export interface RescueRequestListResult {
  items: RescueRequestItem[];
  paging: RescueRequestPaging | null;
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

const parsePaging = (source: any): RescueRequestPaging | null => {
  if (!source || typeof source !== 'object') return null;

  const hasPagingFields =
    source.currentPage !== undefined ||
    source.totalPages !== undefined ||
    source.pageSize !== undefined ||
    source.totalCount !== undefined ||
    source.hasPrevious !== undefined ||
    source.hasNext !== undefined;

  if (!hasPagingFields) return null;

  return {
    currentPage: source.currentPage,
    totalPages: source.totalPages,
    pageSize: source.pageSize,
    totalCount: source.totalCount,
    hasPrevious: source.hasPrevious,
    hasNext: source.hasNext,
  };
};

export const normalizeRescueRequestListResponse = (payload: unknown): RescueRequestListResult => {
  if (isArray(payload)) {
    return {
      items: payload as RescueRequestItem[],
      paging: null,
    };
  }

  const obj = payload as any;

  // Shape A: root contains pagination + items
  if (obj && isArray(obj.items)) {
    return {
      items: obj.items as RescueRequestItem[],
      paging: parsePaging(obj),
    };
  }

  // Shape B: wrapped object { data: RescueRequestItem[] }
  if (obj && isArray(obj.data)) {
    return {
      items: obj.data as RescueRequestItem[],
      paging: parsePaging(obj),
    };
  }

  // Common fallback: { data: { items: [...] } }
  if (obj?.data && isArray(obj.data.items)) {
    return {
      items: obj.data.items as RescueRequestItem[],
      paging: parsePaging(obj.data) || parsePaging(obj),
    };
  }

  return {
    items: [],
    paging: parsePaging(obj),
  };
};

// ─── Types for Mission Tracking ───────────────────────────────────────────────

export interface AssignedRescueTeamDto {
  rescueOperationId?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  operationStatus?: string | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  lastTrackedAt?: string | null;
  estimatedMinutesToArrival?: number | null;
  distanceKmToVictim?: number | null;
  routePolyline?: string | null;
  totalDistanceKm?: number | null;
  totalEstimatedMinutes?: number | null;
}

export interface TeamLocationDto {
  rescueOperationId?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  operationStatus?: string | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  lastTrackedAt?: string | null;
  estimatedMinutesToArrival?: number | null;
  distanceKmToVictim?: number | null;
}

export interface RescueOperationDetail extends RescueOperationItem {
  teamId?: string | null;
  teamName?: string | null;
  status?: string | null;
  endedAt?: string | null;
  completionNote?: string | null;
  completionAttachments?: RescueAttachmentItem[];
}

export interface RescueRequestDetail extends RescueRequestItem {
  rescueOperations?: RescueOperationDetail[];
  assignedRescueTeam?: AssignedRescueTeamDto | null;
}

export interface UpdateOperationStatusPayload {
  status: number;
  note?: string;
}

export interface CompleteOperationPayload {
  attachments: { fileUrl: string; contentType: string }[];
  note?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const rescueRequestService = {
  getRequests: async (statusFilter: number | undefined, pageNumber = 1, pageSize = 10) => {
    const params: Record<string, number> = { pageNumber, pageSize };
    if (typeof statusFilter === 'number') {
      params.statusFilter = statusFilter;
    }

    const response = await apiClient.get('/RescueRequest', { params });

    return normalizeRescueRequestListResponse(response.data);
  },

  getPendingRequests: async (pageNumber = 1, pageSize = 10) => {
    const response = await apiClient.get('/RescueRequest', {
      params: { statusFilter: 0, pageNumber, pageSize },
    });

    return normalizeRescueRequestListResponse(response.data);
  },

  /** GET /api/RescueRequest/{id} — full detail with operations + assignedRescueTeam */
  getById: async (id: string): Promise<RescueRequestDetail> => {
    const response = await apiClient.get(`/RescueRequest/${id}`);
    return (response.data?.data ?? response.data) as RescueRequestDetail;
  },

  /** GET /api/RescueRequest/{id}/team-location — realtime team location (AllowAnonymous) */
  getTeamLocation: async (id: string): Promise<TeamLocationDto> => {
    const response = await apiClient.get(`/RescueRequest/${id}/team-location`);
    return (response.data?.data ?? response.data) as TeamLocationDto;
  },

  /** PATCH /api/RescueRequest/{requestId}/operations/{operationId}/status */
  updateOperationStatus: (
    requestId: string,
    operationId: string,
    payload: UpdateOperationStatusPayload,
  ) => apiClient.patch(`/RescueRequest/${requestId}/operations/${operationId}/status`, payload),

  /** POST /api/RescueRequest/{requestId}/operations/{operationId}/complete */
  completeOperation: (requestId: string, operationId: string, payload: CompleteOperationPayload) =>
    apiClient.post(`/RescueRequest/${requestId}/operations/${operationId}/complete`, payload),

  /** POST /api/RescueRequest/teams/{teamId}/active-batch/recalculate-eta */
  recalculateEta: (teamId: string) =>
    apiClient.post(`/RescueRequest/teams/${teamId}/active-batch/recalculate-eta`),

  verifyRequest: (requestId: string, payload: VerifyRescueRequestPayload) =>
    apiClient.post(`/RescueRequest/${requestId}/verify`, payload),

  rejectRequest: (requestId: string, payload: RejectRescueRequestPayload) =>
    apiClient.post(`/RescueRequest/${requestId}/verify`, payload),

  assignTeam: (requestId: string, payload: AssignTeamPayload) =>
    apiClient.post(`/RescueRequest/${requestId}/assign-team`, payload),

  assignTeamBulk: (payload: AssignTeamBulkPayload) =>
    apiClient.post('/RescueRequest/assign-team-bulk', payload),
};
