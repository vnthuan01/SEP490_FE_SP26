import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

export function PdfSignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
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
      <div ref={containerRef} className="rounded-xl border border-border bg-background p-2">
        <SignatureCanvas
          key={canvasWidth}
          ref={signatureRef}
          penColor="black"
          canvasProps={{
            width: canvasWidth,
            height: 180,
            className: 'block h-[180px] rounded-lg bg-white',
          }}
        />
      </div>
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
