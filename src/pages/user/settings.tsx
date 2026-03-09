import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChangePasswordDialog } from '@/pages/user/components/ChangePasswordDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { roleLabelMap } from '@/constants/roleLabel';
import type { UserRoleType } from '@/enums/UserRole';
import { toast } from 'sonner';

interface SettingsItemProps {
  icon: string;
  iconColor?: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: string;
  destructive?: boolean;
}

function SettingsItem({
  icon,
  iconColor = 'text-primary',
  title,
  description,
  onClick,
  badge,
  destructive = false,
}: SettingsItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors hover:bg-muted/60 group ${
        destructive ? 'hover:bg-destructive/5' : ''
      }`}
    >
      <div
        className={`flex items-center justify-center size-11 rounded-xl flex-shrink-0 ${
          destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10'
        }`}
      >
        <span className={`material-symbols-outlined text-xl ${destructive ? '' : iconColor}`}>
          {icon}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-semibold ${
              destructive ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {title}
          </p>

          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <span
        className={`material-symbols-outlined text-lg transition-transform group-hover:translate-x-0.5 ${
          destructive ? 'text-destructive/50' : 'text-muted-foreground'
        }`}
      >
        chevron_right
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đăng xuất thành công');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Đăng xuất thất bại');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header giống dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Cài đặt</h1>
            <p className="text-muted-foreground">Quản lý tài khoản và tùy chỉnh hệ thống</p>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="rounded-full font-bold border-2"
            onClick={() => navigate('/portal/profile')}
          >
            <span className="material-symbols-outlined">person</span>
            Hồ sơ
          </Button>
        </div>

        {/* Grid layout giống dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User preview */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin tài khoản</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-4">
                <div
                  className={`size-14 rounded-2xl border border-border flex items-center justify-center text-xl font-bold ${
                    user?.avatarUrl ? '' : 'bg-primary text-primary-foreground'
                  }`}
                  style={{
                    backgroundImage: user?.avatarUrl ? `url("${user.avatarUrl}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!user?.avatarUrl && (user?.fullName?.charAt(0)?.toUpperCase() || 'U')}
                </div>

                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-bold truncate">{user?.fullName || 'Chưa cập nhật'}</p>

                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>

                  <Badge variant="secondary" className="mt-1 w-fit">
                    {roleLabelMap[user?.role as UserRoleType] || user?.role || 'Người dùng'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cài đặt tài khoản</CardTitle>
            </CardHeader>

            <CardContent className="p-2">
              <SettingsItem
                icon="person"
                title="Hồ sơ cá nhân"
                description="Xem và chỉnh sửa thông tin cá nhân"
                onClick={() => navigate('/portal/profile')}
              />

              <SettingsItem
                icon="lock"
                title="Đổi mật khẩu"
                description="Cập nhật mật khẩu đăng nhập"
                onClick={() => setIsChangePasswordOpen(true)}
              />
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="lg:col-span-3 border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Vùng nguy hiểm</CardTitle>
            </CardHeader>

            <Separator />

            <CardContent className="p-2">
              <SettingsItem
                icon="logout"
                title="Đăng xuất"
                description="Đăng xuất khỏi tài khoản hiện tại"
                onClick={handleLogout}
                destructive
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </DashboardLayout>
  );
}
