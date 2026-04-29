import { useState } from 'react';
import { useShortageRequests } from '@/hooks/useReliefDistribution';
import { useApproveShortageRequest } from '@/hooks/useShortageRequestActions';
import { useRejectShortageRequest } from '@/hooks/useShortageRequestActions';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatNumberVN } from '@/lib/utils';

interface Props {
  campaignId: string;
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'sheet' | 'inline';
}

export function MobileShortageRequestReview({
  campaignId,
  isOpen = false,
  onClose = () => undefined,
  mode = 'sheet',
}: Props) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { shortageRequests } = useShortageRequests(campaignId, {
    status: 0, // Pending
    pageSize: 50,
  });

  const approveMutation = useApproveShortageRequest();
  const rejectMutation = useRejectShortageRequest();

  const handleApprove = async (requestId: string) => {
    await approveMutation.mutateAsync({
      campaignId,
      shortageRequestId: requestId,
      data: { reviewNote: 'Đã duyệt từ mobile' },
    });
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectNote.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    await rejectMutation.mutateAsync({
      campaignId,
      shortageRequestId: selectedRequest.supplyShortageRequestId,
      data: { reviewNote: rejectNote },
    });
    setShowRejectDialog(false);
    setRejectNote('');
    setSelectedRequest(null);
  };

  const openRejectDialog = (request: any) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const content = (
    <div className="mt-6 space-y-4">
      {shortageRequests.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">Không có yêu cầu nào cần duyệt</p>
        </div>
      ) : (
        shortageRequests.map((request) => (
          <div
            key={request.supplyShortageRequestId}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium">
                  {request.distributionPointName || 'Không có điểm phát'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.campaignTeamName || 'Không có team'} ·
                  {request.requestedByUserName || 'Unknown'}
                </p>
              </div>
              <Badge variant="warning" appearance="light">
                Chờ duyệt
              </Badge>
            </div>

            <div className="space-y-2 mb-3">
              {request.items.map((item) => (
                <div
                  key={item.supplyShortageRequestItemId}
                  className="flex justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{item.supplyItemName}</span>
                  <span>{formatNumberVN(item.quantityRequested)}</span>
                </div>
              ))}
            </div>

            {request.reason && (
              <p className="mb-3 text-sm italic text-muted-foreground">Lý do: {request.reason}</p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleApprove(request.supplyShortageRequestId)}
                disabled={approveMutation.isPending}
              >
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => openRejectDialog(request)}
                disabled={rejectMutation.isPending}
              >
                Từ chối
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      {mode === 'sheet' ? (
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Duyệt yêu cầu thiếu hàng</SheetTitle>
              <SheetDescription>Xem và duyệt các yêu cầu thiếu hàng từ đội phát</SheetDescription>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Duyệt yêu cầu thiếu hàng</h3>
            <p className="text-sm text-muted-foreground">
              Xem và duyệt các yêu cầu thiếu hàng từ đội phát ngay trên trang.
            </p>
          </div>
          {content}
        </div>
      )}

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Nhập lý do từ chối..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectNote('');
                  setSelectedRequest(null);
                }}
              >
                Hủy
              </Button>
              <Button className="flex-1" onClick={handleReject} disabled={!rejectNote.trim()}>
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
