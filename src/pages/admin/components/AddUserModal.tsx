import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UserRole, type UserRoleType } from '@/enums/UserRole';
import { useState } from 'react';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => Promise<void>;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  role: UserRoleType;
  phone?: string;
  active: boolean;
}

export function AddUserModal({ open, onClose, onSubmit }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>({
    fullName: '',
    email: '',
    role: UserRole.Volunteer,
    phone: '',
    active: true,
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm người dùng & phân quyền</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Họ và tên</label>
            <Input
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Vai trò</label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm({ ...form, role: value as UserRoleType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.Admin}>Quản trị viên (Admin)</SelectItem>
                <SelectItem value={UserRole.Coordinator}>Điều phối viên</SelectItem>
                <SelectItem value={UserRole.Volunteer}>Tình nguyện viên</SelectItem>
                <SelectItem value={UserRole.User}>Người dùng bình thường</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Số điện thoại</label>
            <Input
              placeholder="+84..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div
            className={`flex items-center justify-between md:col-span-2 border rounded-lg p-3 transition-colors
    ${form.active ? 'border-green-500/30 bg-green-500/10' : 'border-border'}
  `}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p
                  className={`font-medium ${
                    form.active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-foreground dark:text-foreground'
                  }`}
                >
                  Kích hoạt tài khoản
                </p>

                {form.active && (
                  <div className="flex items-center gap-1 text-green-500 text-xs font-medium bg-green-500/10 px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    ACTIVE
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Cho phép người dùng đăng nhập hệ thống
              </p>
            </div>

            <Switch
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu người dùng'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
