import { useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PdfPreviewCard({
  pdfBytes,
  title,
  className,
}: {
  pdfBytes: Uint8Array | null;
  title: string;
  className?: string;
}) {
  const pdfUrl = useMemo(() => {
    if (!pdfBytes) return '';

    const safeBytes = new Uint8Array(pdfBytes);
    const blob = new Blob([safeBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }, [pdfBytes]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <Card className={`border-border bg-card ${className || ''}`}>
      <CardContent className="p-4 space-y-3 h-full flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-foreground">{title}</p>
          {pdfUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                Mở PDF
              </a>
            </Button>
          )}
        </div>

        {pdfUrl ? (
          <iframe
            title={title}
            src={pdfUrl}
            className="min-h-[640px] flex-1 w-full rounded-xl border border-border bg-background"
          />
        ) : (
          <div className="flex min-h-[640px] flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
            Chưa có PDF để xem trước.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
