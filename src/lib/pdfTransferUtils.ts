import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';

const regularFontUrl = '/fonts/BeVietnamPro-Regular.ttf';
const boldFontUrl = '/fonts/BeVietnamPro-Bold.ttf';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 845;
const PAGE_MARGIN_X = 42;
const TABLE_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const SIGN_BOX = {
  x: 62,
  y: 52,
  width: 205,
  height: 92,
};
const APPROVER_BOX = {
  x: 328,
  y: 52,
  width: 205,
  height: 92,
};

const SIGN_INFO_LABEL_OFFSET = 24;
const SIGN_INFO_NAME_OFFSET = 38;
const SIGN_INFO_DATE_OFFSET = 52;
const SIGN_INFO_CLEAR_TOP_OFFSET = 56;
const SIGN_INFO_CLEAR_HEIGHT = 40;

export interface TransferPdfFillData {
  transferCode: string;
  creatorName: string;
  creatorEmail?: string;
  sourceName: string;
  sourceInventoryName?: string;
  destinationName: string;
  createdAt: string;
  decidedBy?: string;
  approverName?: string;
  reason?: string;
  notes?: string;
  signedDateLabel?: string;
  signedDateTimeLabel?: string;
  referenceAmount?: number | null;
  referenceAmountText?: string;
  clauses?: string[];
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
    actualQuantity?: number;
    sourceAvailableQuantity?: number;
    unitPrice?: number | null;
    totalAmount?: number | null;
  }>;
}

function sanitizePdfText(value?: string | null) {
  return value?.trim() || '';
}

function splitTextIntoLines(text: string, maxWidth: number, font: any, size: number) {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    const nextWidth = font.widthOfTextAtSize(nextLine, size);

    if (nextWidth <= maxWidth || !currentLine) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

function drawWrappedText(
  page: any,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    lineHeight: number;
    size: number;
    font: any;
    color?: { r: number; g: number; b: number };
  },
) {
  const lines = splitTextIntoLines(text, options.maxWidth, options.font, options.size);

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * options.lineHeight,
      size: options.size,
      font: options.font,
      color: options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0, 0, 0),
    });
  });

  return options.y - Math.max(lines.length - 1, 0) * options.lineHeight;
}

function drawCellText(
  page: any,
  text: string,
  x: number,
  y: number,
  width: number,
  font: any,
  size = 8.5,
  align: 'left' | 'center' | 'right' = 'left',
  maxLines = 1,
) {
  const lines = splitTextIntoLines(text || '', width - 8, font, size).slice(0, maxLines);

  lines.forEach((line, lineIndex) => {
    const textWidth = font.widthOfTextAtSize(line, size);
    let drawX = x + 4;

    if (align === 'center') {
      drawX = x + Math.max((width - textWidth) / 2, 2);
    } else if (align === 'right') {
      drawX = x + Math.max(width - textWidth - 4, 2);
    }

    page.drawText(line, {
      x: drawX,
      y: y - lineIndex * (size + 2),
      size,
      font,
      color: rgb(0.12, 0.16, 0.24),
    });
  });
}

async function fetchFontBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Không thể tải font PDF từ ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function loadVietnameseFonts(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    fetchFontBytes(regularFontUrl),
    fetchFontBytes(boldFontUrl),
  ]);

  return {
    regular: await pdfDoc.embedFont(regularBytes),
    bold: await pdfDoc.embedFont(boldBytes),
  };
}

function drawInfoLine(
  page: any,
  label: string,
  value: string,
  x: number,
  y: number,
  labelFont: any,
  valueFont: any,
  maxWidth = 160,
) {
  const valueX = x + 76;
  page.drawText(label, {
    x,
    y,
    size: 9,
    font: labelFont,
    color: rgb(0.28, 0.31, 0.38),
  });

  drawWrappedText(page, value || '................................', {
    x: valueX,
    y,
    maxWidth,
    lineHeight: 11,
    size: 9,
    font: valueFont,
    color: { r: 0.12, g: 0.16, b: 0.24 },
  });

  const valueLines = splitTextIntoLines(
    value || '................................',
    maxWidth,
    valueFont,
    9,
  );
  return y - Math.max(valueLines.length - 1, 0) * 11;
}

function drawCenteredText(
  page: any,
  text: string,
  centerX: number,
  y: number,
  font: any,
  size: number,
  color: { r: number; g: number; b: number },
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: centerX - textWidth / 2,
    y,
    size,
    font,
    color: rgb(color.r, color.g, color.b),
  });
}

export async function buildTransferPdf(data: TransferPdfFillData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { regular: font, bold } = await loadVietnameseFonts(pdfDoc);
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 96,
    width: PAGE_WIDTH,
    height: 96,
    color: rgb(0.95, 0.97, 1),
  });
  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: PAGE_HEIGHT - 86,
    width: TABLE_WIDTH,
    height: 2,
    color: rgb(0.24, 0.42, 0.74),
  });

  page.drawText(
    `Đơn vị / bộ phận: ${sanitizePdfText(data.destinationName) || '................................'}`,
    {
      x: PAGE_MARGIN_X,
      y: 810,
      size: 9,
      font,
      color: rgb(0.24, 0.27, 0.34),
    },
  );
  page.drawText('Mẫu số: BB-ĐP-02', {
    x: 446,
    y: 810,
    size: 9,
    font,
    color: rgb(0.24, 0.27, 0.34),
  });
  drawCenteredText(page, 'BIÊN BẢN XÁC NHẬN ĐỀ NGHỊ ĐIỀU PHỐI', PAGE_WIDTH / 2, 778, bold, 16, {
    r: 0.11,
    g: 0.19,
    b: 0.38,
  });
  drawCenteredText(
    page,
    `Số phiếu: ${sanitizePdfText(data.transferCode)}`,
    PAGE_WIDTH / 2,
    746,
    bold,
    10,
    {
      r: 0.2,
      g: 0.28,
      b: 0.45,
    },
  );

  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: 614,
    width: 242,
    height: 104,
    color: rgb(0.985, 0.989, 0.997),
    borderWidth: 1,
    borderColor: rgb(0.81, 0.86, 0.94),
  });
  page.drawRectangle({
    x: 311,
    y: 614,
    width: 242,
    height: 104,
    color: rgb(0.985, 0.989, 0.997),
    borderWidth: 1,
    borderColor: rgb(0.81, 0.86, 0.94),
  });

  const infoLeftX = 54;
  const infoRightX = 322;
  let y = 694;

  const row1Bottom = Math.min(
    drawInfoLine(page, 'Ngày lập:', sanitizePdfText(data.createdAt), infoLeftX, y, bold, font, 152),
    drawInfoLine(
      page,
      'Người lập:',
      sanitizePdfText(data.creatorName),
      infoRightX,
      y,
      bold,
      font,
      152,
    ),
  );
  y = row1Bottom - 18;

  const row2Bottom = Math.min(
    drawInfoLine(
      page,
      'Email:',
      sanitizePdfText(data.creatorEmail || 'Không có'),
      infoLeftX,
      y,
      bold,
      font,
      152,
    ),
    drawInfoLine(
      page,
      'Phụ trách:',
      sanitizePdfText(data.decidedBy || data.creatorName || ''),
      infoRightX,
      y,
      bold,
      font,
      152,
    ),
  );
  y = row2Bottom - 18;

  const row3Bottom = Math.min(
    drawInfoLine(
      page,
      'Kho nguồn:',
      sanitizePdfText(data.sourceName),
      infoLeftX,
      y,
      bold,
      font,
      152,
    ),
    drawInfoLine(
      page,
      'Lý do:',
      sanitizePdfText(data.reason || 'Đề nghị điều phối vật tư'),
      infoRightX,
      y,
      bold,
      font,
      152,
    ),
  );
  y = row3Bottom - 18;

  const row4Bottom = Math.min(
    drawInfoLine(
      page,
      'Trạm đích:',
      sanitizePdfText(data.destinationName),
      infoLeftX,
      y,
      bold,
      font,
      152,
    ),
  );
  y = row4Bottom - 32;

  page.drawText(
    'Các bên liên quan xác nhận nội dung đề nghị điều phối và danh sách vật tư như sau:',
    {
      x: PAGE_MARGIN_X,
      y,
      size: 10,
      font,
      color: rgb(0.24, 0.27, 0.34),
    },
  );

  const tableTop = y - 18;
  const rowHeight = 34;
  const colWidths = [28, 190, 56, 70, 76, 91];
  const headers = ['STT', 'Tên vật tư / quy cách', 'ĐVT', 'SL đề nghị', 'SL thực tế', 'Ghi chú'];

  let currentX = PAGE_MARGIN_X;
  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: tableTop - rowHeight,
    width: TABLE_WIDTH,
    height: rowHeight,
    color: rgb(0.88, 0.93, 1),
    borderWidth: 1,
    borderColor: rgb(0.67, 0.76, 0.91),
  });

  headers.forEach((header, index) => {
    const width = colWidths[index];
    page.drawRectangle({
      x: currentX,
      y: tableTop - rowHeight,
      width,
      height: rowHeight,
      borderWidth: 1,
      borderColor: rgb(0.67, 0.76, 0.91),
    });
    drawCellText(page, header, currentX, tableTop - 12, width, bold, 7.9, 'center', 2);
    currentX += width;
  });

  let rowY = tableTop - rowHeight;
  const visibleItems = data.items.slice(0, 6);

  visibleItems.forEach((item, index) => {
    rowY -= rowHeight;
    let cellX = PAGE_MARGIN_X;
    const values = [
      String(index + 1),
      sanitizePdfText(item.name),
      sanitizePdfText(item.unit || 'Đơn vị'),
      new Intl.NumberFormat('vi-VN').format(item.quantity || 0),
      new Intl.NumberFormat('vi-VN').format(item.actualQuantity || 0),
      sanitizePdfText(item.notes || ''),
    ];

    values.forEach((value, valueIndex) => {
      const width = colWidths[valueIndex];
      page.drawRectangle({
        x: cellX,
        y: rowY,
        width,
        height: rowHeight,
        borderWidth: 1,
        borderColor: rgb(0.82, 0.86, 0.92),
      });
      drawCellText(
        page,
        value,
        cellX,
        rowY + 22,
        width,
        font,
        8,
        valueIndex === 1 || valueIndex === values.length - 1 ? 'left' : 'center',
        valueIndex === 1 || valueIndex === values.length - 1 ? 2 : 1,
      );
      cellX += width;
    });
  });

  while (visibleItems.length < 6) {
    visibleItems.push({ name: '', quantity: 0, unit: '', notes: '' });
    rowY -= rowHeight;
    let emptyX = PAGE_MARGIN_X;
    colWidths.forEach((width) => {
      page.drawRectangle({
        x: emptyX,
        y: rowY,
        width,
        height: rowHeight,
        borderWidth: 1,
        borderColor: rgb(0.86, 0.89, 0.94),
      });
      emptyX += width;
    });
  }

  const clauses =
    data.clauses && data.clauses.length > 0
      ? data.clauses
      : [
          'Thông tin trên phiếu được kiểm tra và xác nhận là đúng.',
          'Vật tư đề nghị điều phối phải còn hạn sử dụng và đáp ứng quy cách cần thiết.',
          'Người lập phiếu chịu trách nhiệm về nội dung đề nghị và tài liệu đính kèm.',
        ];

  page.drawRectangle({
    x: PAGE_MARGIN_X,
    y: 190,
    width: TABLE_WIDTH,
    height: 130,
    color: rgb(0.988, 0.993, 1),
    borderWidth: 1,
    borderColor: rgb(0.84, 0.88, 0.95),
  });
  page.drawText('QUY ĐỊNH / ĐIỀU KIỆN PHIẾU HỢP LỆ', {
    x: PAGE_MARGIN_X + 12,
    y: 290,
    size: 12,
    font: bold,
    color: rgb(0.14, 0.24, 0.43),
  });

  let clauseY = 272;
  clauses.forEach((clause, index) => {
    clauseY = drawWrappedText(page, `${index + 1}. ${clause}`, {
      x: PAGE_MARGIN_X + 12,
      y: clauseY,
      maxWidth: TABLE_WIDTH - 24,
      lineHeight: 13,
      size: 9,
      font,
      color: { r: 0.22, g: 0.25, b: 0.31 },
    });
    clauseY -= 10;
  });

  page.drawText(
    `Tổng số tiền tham chiếu: ${
      sanitizePdfText(
        data.referenceAmount != null
          ? new Intl.NumberFormat('vi-VN').format(data.referenceAmount)
          : '',
      ) || '................'
    }`,
    {
      x: PAGE_MARGIN_X,
      y: 170,
      size: 10,
      font: bold,
      color: rgb(0.14, 0.24, 0.43),
    },
  );
  page.drawText(
    `Bằng chữ: ${sanitizePdfText(data.referenceAmountText) || '...................................'}`,
    {
      x: 280,
      y: 170,
      size: 10,
      font,
      color: rgb(0.24, 0.27, 0.34),
    },
  );

  page.drawText('Người lập phiếu', {
    x: 104,
    y: 148,
    size: 11,
    font: bold,
    color: rgb(0.14, 0.24, 0.43),
  });
  page.drawText('Kế toán / Phê duyệt', {
    x: 352,
    y: 148,
    size: 11,
    font: bold,
    color: rgb(0.14, 0.24, 0.43),
  });
  page.drawText(
    `Ngày ..... tháng ..... năm ${sanitizePdfText((data.signedDateLabel || '').split('/').pop() || '')}`,
    {
      x: 84,
      y: 136,
      size: 9,
      font,
      color: rgb(0.32, 0.35, 0.42),
    },
  );

  page.drawRectangle({
    x: SIGN_BOX.x,
    y: SIGN_BOX.y,
    width: SIGN_BOX.width,
    height: SIGN_BOX.height,
    borderWidth: 1,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.65, 0.74, 0.9),
  });
  page.drawRectangle({
    x: APPROVER_BOX.x,
    y: APPROVER_BOX.y,
    width: APPROVER_BOX.width,
    height: APPROVER_BOX.height,
    borderWidth: 1,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.65, 0.74, 0.9),
  });

  page.drawText('Ký, ghi rõ họ tên', {
    x: SIGN_BOX.x + 48,
    y: SIGN_BOX.y + 8,
    size: 9,
    font,
    color: rgb(0.48, 0.52, 0.6),
  });
  page.drawText('Họ và tên:', {
    x: SIGN_BOX.x,
    y: SIGN_BOX.y - SIGN_INFO_LABEL_OFFSET,
    size: 9,
    font: bold,
    color: rgb(0.28, 0.31, 0.38),
  });
  page.drawText(sanitizePdfText(data.creatorName) || '................................', {
    x: SIGN_BOX.x,
    y: SIGN_BOX.y - SIGN_INFO_NAME_OFFSET,
    size: 9,
    font,
    color: rgb(0.12, 0.16, 0.24),
  });
  page.drawText('Ký, ghi rõ họ tên', {
    x: APPROVER_BOX.x + 48,
    y: APPROVER_BOX.y + 8,
    size: 9,
    font,
    color: rgb(0.48, 0.52, 0.6),
  });
  page.drawText('Họ và tên:', {
    x: APPROVER_BOX.x,
    y: APPROVER_BOX.y - SIGN_INFO_LABEL_OFFSET,
    size: 9,
    font: bold,
    color: rgb(0.28, 0.31, 0.38),
  });
  page.drawText(sanitizePdfText(data.approverName) || '................................', {
    x: APPROVER_BOX.x,
    y: APPROVER_BOX.y - SIGN_INFO_NAME_OFFSET,
    size: 9,
    font,
    color: rgb(0.12, 0.16, 0.24),
  });

  return pdfDoc.save();
}

export async function updateTransferPdfApprovalData(
  pdfBytes: Uint8Array | ArrayBuffer,
  data: TransferPdfFillData,
) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { regular: font, bold } = await loadVietnameseFonts(pdfDoc);

  const infoLeftX = 54;
  const infoRightX = 322;
  let y = 658;

  const row3Bottom = Math.min(
    drawInfoLine(
      page,
      'Kho nguồn:',
      sanitizePdfText(data.sourceName),
      infoLeftX,
      y,
      bold,
      font,
      152,
    ),
    drawInfoLine(
      page,
      'Lý do:',
      sanitizePdfText(data.reason || 'Đề nghị điều phối vật tư'),
      infoRightX,
      y,
      bold,
      font,
      152,
    ),
  );
  y = row3Bottom - 18;

  const row4Bottom = Math.min(
    drawInfoLine(
      page,
      'Trạm đích:',
      sanitizePdfText(data.destinationName),
      infoLeftX,
      y,
      bold,
      font,
      152,
    ),
  );
  y = row4Bottom - 32;

  const tableTop = y - 18;
  const rowHeight = 34;
  const colWidths = [28, 190, 56, 70, 76, 91];
  const visibleItems = data.items.slice(0, 6);
  const actualQuantityX = PAGE_MARGIN_X + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
  const notesX = actualQuantityX + colWidths[4];

  visibleItems.forEach((item, index) => {
    const rowY = tableTop - rowHeight * (index + 2);

    page.drawRectangle({
      x: actualQuantityX,
      y: rowY,
      width: colWidths[4],
      height: rowHeight,
      color: rgb(1, 1, 1),
      borderWidth: 1,
      borderColor: rgb(0.82, 0.86, 0.92),
    });
    drawCellText(
      page,
      new Intl.NumberFormat('vi-VN').format(item.actualQuantity || 0),
      actualQuantityX,
      rowY + 22,
      colWidths[4],
      font,
      8,
      'center',
      1,
    );

    page.drawRectangle({
      x: notesX,
      y: rowY,
      width: colWidths[5],
      height: rowHeight,
      color: rgb(1, 1, 1),
      borderWidth: 1,
      borderColor: rgb(0.82, 0.86, 0.92),
    });
    drawCellText(
      page,
      sanitizePdfText(item.notes || ''),
      notesX,
      rowY + 22,
      colWidths[5],
      font,
      8,
      'left',
      2,
    );
  });

  page.drawRectangle({
    x: PAGE_MARGIN_X - 2,
    y: 162,
    width: 260,
    height: 18,
    color: rgb(1, 1, 1),
  });
  page.drawText(
    `Tổng số tiền tham chiếu: ${
      sanitizePdfText(
        data.referenceAmount != null
          ? `${new Intl.NumberFormat('vi-VN').format(data.referenceAmount)} VND`
          : '',
      ) || '................'
    }`,
    {
      x: PAGE_MARGIN_X,
      y: 170,
      size: 10,
      font: bold,
      color: rgb(0.14, 0.24, 0.43),
    },
  );

  page.drawRectangle({
    x: 278,
    y: 156,
    width: 275,
    height: 28,
    color: rgb(1, 1, 1),
  });
  drawWrappedText(
    page,
    `Bằng chữ: ${sanitizePdfText(data.referenceAmountText) || '...................................'}`,
    {
      x: 280,
      y: 170,
      maxWidth: 260,
      lineHeight: 11,
      size: 10,
      font,
      color: { r: 0.24, g: 0.27, b: 0.34 },
    },
  );

  page.drawRectangle({
    x: APPROVER_BOX.x - 2,
    y: APPROVER_BOX.y - SIGN_INFO_CLEAR_TOP_OFFSET,
    width: 195,
    height: SIGN_INFO_CLEAR_HEIGHT,
    color: rgb(1, 1, 1),
  });
  page.drawText('Họ và tên:', {
    x: APPROVER_BOX.x,
    y: APPROVER_BOX.y - SIGN_INFO_LABEL_OFFSET,
    size: 9,
    font: bold,
    color: rgb(0.28, 0.31, 0.38),
  });
  page.drawText(sanitizePdfText(data.approverName) || '................................', {
    x: APPROVER_BOX.x,
    y: APPROVER_BOX.y - SIGN_INFO_NAME_OFFSET,
    size: 9,
    font,
    color: rgb(0.12, 0.16, 0.24),
  });
  page.drawText(
    `Ngày ký: ${sanitizePdfText(data.signedDateTimeLabel || data.signedDateLabel || '................................')}`,
    {
      x: APPROVER_BOX.x,
      y: APPROVER_BOX.y - SIGN_INFO_DATE_OFFSET,
      size: 8,
      font,
      color: rgb(0.32, 0.35, 0.42),
    },
  );

  return pdfDoc.save();
}

export async function attachSignatureToPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  signatureDataUrl: string,
  options?: {
    signerName?: string;
    box?: 'creator' | 'approver';
  },
) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { regular: font } = await loadVietnameseFonts(pdfDoc);
  const pngImage = await pdfDoc.embedPng(signatureDataUrl);
  const targetBox = options?.box === 'approver' ? APPROVER_BOX : SIGN_BOX;
  const imageScale = Math.min(
    targetBox.width / pngImage.width,
    (targetBox.height - 40) / pngImage.height,
    1,
  );
  const dims = pngImage.scale(imageScale);
  const drawX = targetBox.x + (targetBox.width - dims.width) / 2;
  const drawY = targetBox.y + 24 + (targetBox.height - 44 - dims.height) / 2;

  lastPage.drawImage(pngImage, {
    x: drawX,
    y: drawY,
    width: dims.width,
    height: dims.height,
  });

  if (options?.signerName) {
    lastPage.drawRectangle({
      x: targetBox.x,
      y: targetBox.y - SIGN_INFO_CLEAR_TOP_OFFSET,
      width: 195,
      height: SIGN_INFO_CLEAR_HEIGHT,
      color: rgb(1, 1, 1),
    });
    lastPage.drawText('Họ và tên:', {
      x: targetBox.x,
      y: targetBox.y - SIGN_INFO_LABEL_OFFSET,
      size: 9,
      font,
      color: rgb(0.28, 0.31, 0.38),
    });
    lastPage.drawText(sanitizePdfText(options.signerName), {
      x: targetBox.x,
      y: targetBox.y - SIGN_INFO_NAME_OFFSET,
      size: 9,
      font,
      color: rgb(0.12, 0.16, 0.24),
    });
    lastPage.drawText(`Ngày ký: ${sanitizePdfText(new Date().toLocaleString('vi-VN'))}`, {
      x: targetBox.x,
      y: targetBox.y - SIGN_INFO_DATE_OFFSET,
      size: 8,
      font,
      color: rgb(0.32, 0.35, 0.42),
    });
  }

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
