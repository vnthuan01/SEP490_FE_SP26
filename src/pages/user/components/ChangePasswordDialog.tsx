import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { resolveChangePasswordErrorMessage } from '@/lib/backendErrors/authErrorResolver';

type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { changePassword, changePasswordStatus } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const isSubmitting = changePasswordStatus === 'pending';

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    if (values.newPassword !== values.confirmNewPassword) {
      form.setError('confirmNewPassword', {
        message: 'Mật khẩu xác nhận không khớp',
      });
      return;
    }

    if (values.newPassword.length < 6) {
      form.setError('newPassword', {
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
      return;
    }

    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      handleClose();
    } catch (err: any) {
      toast.error(resolveChangePasswordErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <div>
              <DialogTitle>Đổi mật khẩu</DialogTitle>
              <DialogDescription>Nhập mật khẩu hiện tại và mật khẩu mới</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Current password */}
            <FormField
              control={form.control}
              name="currentPassword"
              rules={{ required: 'Vui lòng nhập mật khẩu hiện tại' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu hiện tại</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showCurrent ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrent ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New password */}
            <FormField
              control={form.control}
              name="newPassword"
              rules={{
                required: 'Vui lòng nhập mật khẩu mới',
                minLength: { value: 6, message: 'Tối thiểu 6 ký tự' },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showNew ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu mới"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm new password */}
            <FormField
              control={form.control}
              name="confirmNewPassword"
              rules={{ required: 'Vui lòng xác nhận mật khẩu mới' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu mới"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">lock_reset</span>
                    Đổi mật khẩu
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
