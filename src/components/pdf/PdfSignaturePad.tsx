import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

export function PdfSignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const signatureRef = useRef<SignatureCanvas | null>(null);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-background p-2">
        <SignatureCanvas
          ref={signatureRef}
          penColor="black"
          canvasProps={{
            width: 520,
            height: 180,
            className: 'w-full h-[180px] rounded-lg bg-white',
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
