import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

export function PdfSignaturePad({
  onSave,
  height = 180,
  helperText,
}: {
  onSave: (dataUrl: string) => void;
  height?: number;
  helperText?: string;
}) {
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(520);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateCanvasWidth = () => {
      const nextWidth = Math.max(Math.floor(container.clientWidth - 16), 280);
      setCanvasWidth(nextWidth);
    };

    updateCanvasWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasWidth();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-background to-muted/20 p-2 shadow-sm"
      >
        <SignatureCanvas
          key={canvasWidth}
          ref={signatureRef}
          penColor="black"
          canvasProps={{
            width: canvasWidth,
            height,
            className: 'block w-full rounded-xl bg-white',
          }}
        />
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => signatureRef.current?.clear()}>
          Xóa chữ ký
        </Button>
        <Button
          onClick={() => {
            if (!signatureRef.current || signatureRef.current.isEmpty()) return;
            onSave(signatureRef.current.toDataURL('image/png'));
          }}
        >
          Lưu chữ ký
        </Button>
      </div>
    </div>
  );
}
