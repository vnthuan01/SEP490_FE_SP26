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
import { parseApiError } from '@/lib/apiErrors';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => Promise<boolean>;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: UserRoleType;
  phone?: string;
  active: boolean;
}

export function AddUserModal({ open, onClose, onSubmit }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>({
    fullName: '',
    email: '',
    password: '',
    role: UserRole.Coordinator,
    phone: '',
    active: true,
  });
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'fullName' | 'email' | 'password' | 'role' | 'phone', string>>
  >({});

  const validate = () => {
    const nextErrors: Partial<
      Record<'fullName' | 'email' | 'password' | 'role' | 'phone', string>
    > = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Vui lòng nhập họ và tên.';
    if (!form.email.trim()) nextErrors.email = 'Vui lòng nhập email.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Email không hợp lệ.';
    if (!form.password.trim()) nextErrors.password = 'Vui lòng nhập mật khẩu.';
    else if (form.password.trim().length < 6)
      nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (!form.role) nextErrors.role = 'Vui lòng chọn vai trò.';
    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    try {
      setLoading(true);
      setSubmitError('');
      const success = await onSubmit(form);
      if (success) {
        onClose();
      } else {
        setSubmitError('Không thể tạo người dùng. Vui lòng kiểm tra lại thông tin và thử lại.');
      }
    } catch (error) {
      setSubmitError(parseApiError(error, 'Không thể tạo người dùng. Vui lòng thử lại.').message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (loading) return;
        if (!nextOpen) onClose();
      }}
    >
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
              onChange={(e) => {
                setForm({ ...form, fullName: e.target.value });
                setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                setSubmitError('');
              }}
            />
            {fieldErrors.fullName ? (
              <p className="text-xs text-red-500">{fieldErrors.fullName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
                setSubmitError('');
              }}
            />
            {fieldErrors.email ? <p className="text-xs text-red-500">{fieldErrors.email}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mật khẩu</label>
            <Input
              type="password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                setSubmitError('');
              }}
            />
            {fieldErrors.password ? (
              <p className="text-xs text-red-500">{fieldErrors.password}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Vai trò</label>
            <Select
              value={form.role}
              onValueChange={(value) => {
                setForm({ ...form, role: value as UserRoleType });
                setFieldErrors((prev) => ({ ...prev, role: undefined }));
                setSubmitError('');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.Coordinator}>Điều phối viên</SelectItem>
                <SelectItem value={UserRole.Manager}>Quản lí</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.role ? <p className="text-xs text-red-500">{fieldErrors.role}</p> : null}
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

        {submitError ? (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
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
