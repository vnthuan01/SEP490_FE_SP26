import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { roleLabelMap } from '@/constants/roleLabel';
import type { UserRoleType } from '@/enums/UserRole';
import type { UserProfile } from '@/services/userService';

interface EditUserModalProps {
  open: boolean;
  user: UserProfile | null;
  loading?: boolean;
  onClose: () => void;
  onToggleActive: (user: UserProfile) => Promise<void>;
}

export function EditUserModal({
  open,
  user,
  loading = false,
  onClose,
  onToggleActive,
}: EditUserModalProps) {
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thông tin người dùng</DialogTitle>
        </DialogHeader>

        {!user ? (
          <p className="text-sm text-muted-foreground">Không tìm thấy dữ liệu người dùng.</p>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Họ và tên</label>
                <Input value={user.displayName ?? ''} readOnly disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={user.email} readOnly disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Số điện thoại</label>
                <Input value={user.phoneNumber ?? ''} readOnly disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vai trò</label>
                <div className="flex flex-wrap gap-1 min-h-9 items-center">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <Badge key={role} size="xs" variant="secondary">
                        {roleLabelMap[role as UserRoleType] || role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Trạng thái tài khoản</p>
                <p className="text-sm text-muted-foreground">
                  {user.isBanned ? 'Đang bị khóa' : 'Đang hoạt động'}
                </p>
              </div>
              <Button
                variant={user.isBanned ? 'primary' : 'destructive'}
                onClick={() => onToggleActive(user)}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : user.isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
