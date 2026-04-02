import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PdfSignaturePad } from './PdfSignaturePad';
import { PdfPreviewCard } from './PdfPreviewCard';
import { usePrepareTransferEvidence } from '@/hooks/useTransferEvidence';
import type { PrepareTransferEvidencePayload } from '@/services/transferEvidenceService';
import {
  attachSignatureToPdf,
  buildTransferPdf,
  downloadPdf,
  type TransferPdfFillData,
} from '@/lib/pdfTransferUtils';
import { toast } from 'sonner';

export function TransferPdfWorkflowDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TransferPdfFillData | null;
}) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [preparedEvidenceCount, setPreparedEvidenceCount] = useState(0);
  const { mutateAsync: prepareTransferEvidence, status: prepareTransferEvidenceStatus } =
    usePrepareTransferEvidence();

  const handleBuildPdf = async () => {
    if (!data) return;
    setIsBuilding(true);
    try {
      const bytes = await buildTransferPdf(data);
      setPdfBytes(bytes);
      toast.success('Đã tạo PDF biên bản chuyển kho');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleEmbedSignature = async () => {
    if (!pdfBytes || !signatureDataUrl) {
      toast.error('Cần tạo PDF và lưu chữ ký trước.');
      return;
    }

    const signedBytes = await attachSignatureToPdf(pdfBytes, signatureDataUrl);
    setPdfBytes(signedBytes);
    toast.success('Đã nhúng chữ ký vào PDF');
  };

  const handlePrepareUpload = async () => {
    if (!pdfBytes) {
      toast.error('Cần tạo PDF trước khi chuẩn bị upload.');
      return;
    }

    const files: PrepareTransferEvidencePayload['files'] = [
      {
        fileName: `bien-ban-chuyen-kho-${Date.now()}.pdf`,
        mimeType: 'application/pdf',
        blob: new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
        type: 'pdf',
        note: 'PDF biên bản chuyển kho đã fill dữ liệu sẵn',
      },
    ];

    if (signatureDataUrl) {
      const signatureBlob = await (await fetch(signatureDataUrl)).blob();
      files.push({
        fileName: `chu-ky-${Date.now()}.png`,
        mimeType: 'image/png',
        blob: signatureBlob,
        type: 'signature',
        note: 'Chữ ký tay của người xác nhận',
      });
    }

    const prepared = await prepareTransferEvidence({
      transferId: data?.transferCode,
      files,
    });

    setPreparedEvidenceCount(prepared.length);
    toast.success('Đã chuẩn bị payload upload cho server');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[94vw] max-w-6xl h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Chuẩn bị PDF biên bản chuyển kho</DialogTitle>
          <DialogDescription>
            FE đã được cấu hình sẵn để fill PDF, ký tay, xem trước và sẵn sàng nối API upload khi
            backend hỗ trợ.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <PdfPreviewCard pdfBytes={pdfBytes} title="Xem trước PDF biên bản" />
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 1: Tạo và fill PDF</p>
              <Button onClick={handleBuildPdf} disabled={!data || isBuilding}>
                {isBuilding ? 'Đang tạo PDF...' : 'Tạo PDF từ dữ liệu server'}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 2: Ký tay</p>
              <PdfSignaturePad onSave={setSignatureDataUrl} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">
                Bước 3: Nhúng chữ ký, tải PDF và chuẩn bị upload
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleEmbedSignature}
                  disabled={!pdfBytes || !signatureDataUrl}
                >
                  Nhúng chữ ký vào PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    pdfBytes && downloadPdf(pdfBytes, `bien-ban-chuyen-kho-${Date.now()}.pdf`)
                  }
                  disabled={!pdfBytes}
                >
                  Tải PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrepareUpload}
                  disabled={!pdfBytes || prepareTransferEvidenceStatus === 'pending'}
                >
                  {prepareTransferEvidenceStatus === 'pending'
                    ? 'Đang chuẩn bị...'
                    : 'Chuẩn bị payload upload'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                FE placeholder đã chuẩn bị: {preparedEvidenceCount} hồ sơ. Khi backend có endpoint
                upload, chỉ cần thay hàm này bằng API call thật.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
