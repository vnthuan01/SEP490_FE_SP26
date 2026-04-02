export type TransferEvidenceType = 'pdf' | 'image' | 'video' | 'document' | 'signature';

export interface TransferEvidenceRecord {
  id: string;
  transferId?: string;
  transactionId?: string;
  type: TransferEvidenceType;
  fileName: string;
  mimeType: string;
  fileUrl?: string;
  createdAt: string;
  uploadedBy?: string;
  note?: string;
}

export interface PrepareTransferEvidencePayload {
  transferId?: string;
  transactionId?: string;
  files: Array<{
    fileName: string;
    mimeType: string;
    note?: string;
    blob: Blob;
    type: TransferEvidenceType;
  }>;
}

const memoryTransferEvidenceStore: TransferEvidenceRecord[] = [];

export const transferEvidenceService = {
  async prepareLocalEvidence(payload: PrepareTransferEvidencePayload) {
    const createdAt = new Date().toISOString();
    const records = payload.files.map((file) => ({
      id: crypto.randomUUID(),
      transferId: payload.transferId,
      transactionId: payload.transactionId,
      type: file.type,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileUrl: URL.createObjectURL(file.blob),
      createdAt,
      uploadedBy: 'FE placeholder',
      note: file.note,
    }));

    memoryTransferEvidenceStore.push(...records);
    return records;
  },

  async getByTransferId(transferId: string) {
    return memoryTransferEvidenceStore.filter((item) => item.transferId === transferId);
  },

  async getByTransactionId(transactionId: string) {
    return memoryTransferEvidenceStore.filter((item) => item.transactionId === transactionId);
  },
};
