import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface TransferPdfFillData {
  transferCode: string;
  sourceName: string;
  destinationName: string;
  createdAt: string;
  decidedBy?: string;
  notes?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
  }>;
}

export async function buildTransferPdf(data: TransferPdfFillData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;

  page.drawText('BIÊN BẢN CHUYỂN KHO / GIAO NHẬN HÀNG', {
    x: 50,
    y,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 40;
  const lines = [
    `Mã phiếu: ${data.transferCode}`,
    `Kho nguồn: ${data.sourceName}`,
    `Kho/Trạm đích: ${data.destinationName}`,
    `Thời gian lập: ${data.createdAt}`,
    `Người phụ trách: ${data.decidedBy || 'Chưa cập nhật'}`,
    `Ghi chú: ${data.notes || 'Không có'}`,
  ];

  lines.forEach((line) => {
    page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 22;
  });

  y -= 10;
  page.drawText('Danh sách vật phẩm:', {
    x: 50,
    y,
    size: 13,
    font: bold,
  });
  y -= 24;

  data.items.forEach((item, index) => {
    page.drawText(
      `${index + 1}. ${item.name} - ${new Intl.NumberFormat('vi-VN').format(item.quantity)} ${item.unit || ''}`,
      { x: 60, y, size: 11, font },
    );
    y -= 20;
  });

  y -= 30;
  page.drawText('Khu vực chữ ký người bàn giao / người nhận hàng', {
    x: 50,
    y,
    size: 12,
    font: bold,
  });

  page.drawRectangle({
    x: 50,
    y: y - 170,
    width: 220,
    height: 130,
    borderWidth: 1,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.8, 0.8, 0.8),
  });
  page.drawRectangle({
    x: 320,
    y: y - 170,
    width: 220,
    height: 130,
    borderWidth: 1,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.8, 0.8, 0.8),
  });

  return pdfDoc.save();
}

export async function attachSignatureToPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  signatureDataUrl: string,
) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const pngImage = await pdfDoc.embedPng(signatureDataUrl);
  const dims = pngImage.scale(0.35);

  lastPage.drawImage(pngImage, {
    x: 70,
    y: 80,
    width: dims.width,
    height: dims.height,
  });

  return pdfDoc.save();
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const safeBytes = new Uint8Array(bytes);
  const blob = new Blob([safeBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
