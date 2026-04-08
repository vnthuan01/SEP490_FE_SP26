import { apiClient } from '@/lib/apiClients';

export interface ReliefFulfillmentItemPayload {
  supplyItemId: string;
  needCategory: number;
  plannedQuantity: number;
  actualDeliveredQuantity: number;
  note?: string;
}

export interface CreateReliefFulfillmentPayload {
  reliefRequestId: string;
  recipientName: string;
  recipientPhone: string;
  deliveryNote?: string;
  proofImageUrl?: string;
  deliveredAt: string;
  items: ReliefFulfillmentItemPayload[];
}

export interface UpdateReliefFulfillmentProofPayload {
  proofImageUrl: string;
  deliveryNote?: string;
}

export interface MarkReliefFulfillmentFailedPayload {
  note: string;
}

export interface ReliefFulfillment {
  id: string;
  distributionSessionId?: string;
  reliefRequestId?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryNote?: string;
  proofImageUrl?: string;
  deliveredAt?: string;
  status?: number;
  statusName?: string;
  items?: ReliefFulfillmentItemPayload[];
}

async function postFulfillmentToSession(data: CreateReliefFulfillmentPayload, endpoint: string) {
  return apiClient.post<ReliefFulfillment>(endpoint, data);
}

export const reliefFulfillmentService = {
  createBySession: async (id: string, data: CreateReliefFulfillmentPayload) => {
    try {
      return await postFulfillmentToSession(data, `/distributionsessions/${id}/fulfillments`);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return postFulfillmentToSession(data, `/distributionsession/${id}/fulfillments`);
      }
      throw error;
    }
  },

  getByRequest: (requestId: string) =>
    apiClient.get<ReliefFulfillment[] | ReliefFulfillment>(
      `/ReliefFulfillment/by-request/${requestId}`,
    ),

  getBySession: (sessionId: string) =>
    apiClient.get<ReliefFulfillment[] | ReliefFulfillment>(
      `/ReliefFulfillment/by-session/${sessionId}`,
    ),

  uploadProof: (id: string, data: UpdateReliefFulfillmentProofPayload) =>
    apiClient.post<ReliefFulfillment>(`/ReliefFulfillment/${id}/proof`, data),

  markFailed: (id: string, data: MarkReliefFulfillmentFailedPayload) =>
    apiClient.post<ReliefFulfillment>(`/ReliefFulfillment/${id}/failed`, data),
};
