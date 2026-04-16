import { useEffect, useMemo, useState } from 'react';
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
  onAttachPdf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TransferPdfFillData | null;
  onAttachPdf: (file: File) => void;
}) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [clausesAccepted, setClausesAccepted] = useState([false, false, false]);
  const [selectedTemplate, setSelectedTemplate] = useState<'request' | 'handover'>('request');

  const signedDateLabel = useMemo(() => new Date().toLocaleDateString('vi-VN'), []);

  useEffect(() => {
    if (!open) return;
    setPdfBytes(null);
    setSignatureDataUrl('');
    setClausesAccepted([false, false, false]);
    setSelectedTemplate('request');
  }, [open, data?.transferCode]);

  const handleBuildPdf = async () => {
    if (!data) return;
    setIsBuilding(true);
    try {
      const bytes = await buildTransferPdf({ ...data, templateType: selectedTemplate });
      setPdfBytes(bytes);
      toast.success('Đã tạo PDF mẫu');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleEmbedSignature = async () => {
    if (!pdfBytes || !signatureDataUrl) {
      toast.error('Cần tạo PDF và lưu chữ ký trước.');
      return;
    }

    if (clausesAccepted.some((value) => !value)) {
      toast.error('Vui lòng xác nhận đầy đủ các điều khoản trước khi ký.');
      return;
    }

    const signedBytes = await attachSignatureToPdf(pdfBytes, signatureDataUrl, {
      signerName: data?.creatorName,
    });
    setPdfBytes(signedBytes);
    toast.success('Đã nhúng chữ ký vào PDF');
  };

  const handleAttachPdf = async () => {
    if (!pdfBytes) {
      toast.error('Cần tạo PDF trước khi thêm vào phiếu.');
      return;
    }

    const fileName = `phieu-dieu-phoi-${data?.transferCode || Date.now()}.pdf`;
    const file = new File([new Uint8Array(pdfBytes)], fileName, { type: 'application/pdf' });
    onAttachPdf(file);
    toast.success('Đã thêm PDF vào danh sách hồ sơ đính kèm');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[94vw] max-w-6xl h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Chuẩn bị PDF phiếu điều phối</DialogTitle>
          <DialogDescription>
            Tạo 2 mẫu PDF tiếng Việt có dấu từ thông tin phiếu điều phối, xác nhận điều khoản và ký
            tay trước khi đính kèm vào phiếu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-stretch">
          <PdfPreviewCard pdfBytes={pdfBytes} title="Xem trước PDF" className="h-full" />
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 1: Chọn mẫu PDF</p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant={selectedTemplate === 'request' ? 'primary' : 'outline'}
                  onClick={() => setSelectedTemplate('request')}
                >
                  Mẫu 1: Phiếu yêu cầu nhập kho / điều phối
                </Button>
                <Button
                  variant={selectedTemplate === 'handover' ? 'primary' : 'outline'}
                  onClick={() => setSelectedTemplate('handover')}
                >
                  Mẫu 2: Biên bản xác nhận đề nghị điều phối
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 2: Tạo PDF mẫu</p>
              <Button onClick={handleBuildPdf} disabled={!data || isBuilding}>
                {isBuilding ? 'Đang tạo PDF...' : 'Tạo PDF mẫu'}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 3: Xác nhận điều khoản</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {[
                  'Tôi xác nhận thông tin phiếu điều phối là chính xác.',
                  'Tôi đã kiểm tra kho nguồn và vật tư yêu cầu trước khi gửi phiếu.',
                  'Tôi chịu trách nhiệm về chữ ký và tài liệu đính kèm trong phiếu này.',
                ].map((clause, index) => (
                  <label
                    key={clause}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={clausesAccepted[index]}
                      onChange={(e) =>
                        setClausesAccepted((prev) =>
                          prev.map((value, currentIndex) =>
                            currentIndex === index ? e.target.checked : value,
                          ),
                        )
                      }
                      className="mt-1"
                    />
                    <span>{clause}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 4: Ký tay</p>
              <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
                <p>
                  Người ký:{' '}
                  <span className="font-medium text-foreground">{data?.creatorName || '—'}</span>
                </p>
                <p>
                  Ngày ký: <span className="font-medium text-foreground">{signedDateLabel}</span>
                </p>
              </div>
              <PdfSignaturePad onSave={setSignatureDataUrl} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">
                Bước 5: Nhúng chữ ký và thêm vào phiếu
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
                <Button variant="primary" onClick={handleAttachPdf} disabled={!pdfBytes}>
                  Thêm PDF vào phiếu
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Sau khi thêm, PDF sẽ xuất hiện trong danh sách hồ sơ đính kèm của phiếu điều phối.
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
