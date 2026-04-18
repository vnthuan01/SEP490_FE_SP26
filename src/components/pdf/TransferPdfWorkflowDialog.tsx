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
  const signedDateLabel = useMemo(() => new Date().toLocaleDateString('vi-VN'), []);

  useEffect(() => {
    if (!open) return;
    setPdfBytes(null);
    setSignatureDataUrl('');
    setClausesAccepted([false, false, false]);
  }, [open, data?.transferCode]);

  const handleBuildPdf = async () => {
    if (!data) return;
    setIsBuilding(true);
    try {
      const bytes = await buildTransferPdf(data);
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
          <DialogTitle>Chuẩn bị biên bản xác nhận đề nghị điều phối</DialogTitle>
          <DialogDescription>
            Tạo biên bản mẫu 2, để người gửi phiếu ký trước trong khung người lập phiếu. Sau khi có
            file đã ký, bạn sẽ điền phần còn thiếu, phê duyệt và ký trong khung phê duyệt sau.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-stretch">
          <PdfPreviewCard pdfBytes={pdfBytes} title="Xem trước PDF" className="h-full" />
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 1: Xác nhận mẫu PDF</p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                Đang sử dụng duy nhất{' '}
                <span className="font-semibold">Mẫu 2: Biên bản xác nhận đề nghị điều phối</span>.
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">Bước 2: Tạo PDF mẫu</p>
              <Button onClick={handleBuildPdf} disabled={!data || isBuilding}>
                {isBuilding ? 'Đang tạo PDF...' : 'Tạo PDF mẫu'}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">
                Bước 3: Xác nhận trước khi người gửi ký
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {[
                  'Tôi xác nhận nội dung biên bản và danh sách vật tư là đúng trước khi gửi người lập phiếu ký.',
                  'Tôi hiểu rằng các phần tổng số tiền tham chiếu, bằng chữ và phê duyệt sẽ được điền sau.',
                  'Tôi chịu trách nhiệm về chữ ký và file PDF đính kèm trong quy trình phê duyệt sau đó.',
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
              <p className="font-semibold text-foreground">Bước 4: Người lập phiếu ký trước</p>
              <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
                <p>
                  Người ký:{' '}
                  <span className="font-medium text-foreground">{data?.creatorName || '—'}</span>
                </p>
                <p>
                  Ngày ký: <span className="font-medium text-foreground">{signedDateLabel}</span>
                </p>
                <p>
                  Vị trí ký:{' '}
                  <span className="font-medium text-foreground">Khung “Người lập phiếu”</span>
                </p>
              </div>
              <PdfSignaturePad
                onSave={setSignatureDataUrl}
                height={240}
                helperText="Kéo rộng theo chiều ngang để chữ ký thoáng hơn, sau đó bấm “Lưu chữ ký” trước khi nhúng vào PDF."
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">
                Bước 5: Nhúng chữ ký và lưu PDF để phê duyệt sau
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                <span className="font-semibold">Nút chính:</span> Nhúng chữ ký vào PDF để cập nhật
                trực tiếp file đang xem trước, rồi thêm vào phiếu.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  className="gap-2"
                  onClick={handleEmbedSignature}
                  disabled={!pdfBytes || !signatureDataUrl}
                >
                  <span className="material-symbols-outlined text-lg">draw</span>
                  Nhúng chữ ký vào PDF
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    pdfBytes && downloadPdf(pdfBytes, `bien-ban-chuyen-kho-${Date.now()}.pdf`)
                  }
                  disabled={!pdfBytes}
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Tải PDF
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleAttachPdf}
                  disabled={!pdfBytes}
                >
                  <span className="material-symbols-outlined text-lg">attach_file_add</span>
                  Thêm PDF vào phiếu
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Sau khi thêm, bạn có thể dùng file PDF này để điền phần còn thiếu, ký trong khung
                phê duyệt và hoàn tất bước phê duyệt sau.
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
