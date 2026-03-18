import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/provider/auth/AuthProvider';
import { useUserProfile } from '@/hooks/useUsers';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChangePasswordDialog } from '@/pages/user/components/ChangePasswordDialog';
import CustomCalendar from '@/components/ui/customCalendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Loading from '@/components/ui/loading';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const { profile, isLoading, updateProfile, updateProfileStatus } = useUserProfile();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');

  // Sync form state when profile loads without triggering set-state-in-effect
  const [prevProfile, setPrevProfile] = useState<any>(null);
  if (profile && profile !== prevProfile) {
    setPrevProfile(profile);
    setDisplayName(profile.displayName || '');
    setPhoneNumber(profile.phoneNumber || '');
    setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '');
    setGender(profile.gender || '');
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Đăng xuất thành công');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Đăng xuất thất bại');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      if (displayName) formData.append('DisplayName', displayName);
      if (phoneNumber) formData.append('PhoneNumber', phoneNumber);
      if (dateOfBirth) formData.append('DateOfBirth', new Date(dateOfBirth).toISOString());
      if (gender) formData.append('Gender', gender);

      await updateProfile(formData);
      toast.success('Cập nhật hồ sơ thành công!');
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors) {
        const messages = Object.values(errors).flat().join(', ');
        toast.error(messages || 'Cập nhật thất bại');
      } else {
        toast.error('Cập nhật hồ sơ thất bại. Vui lòng thử lại.');
      }
    }
  };

  const handleReset = () => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '');
      setGender(profile.gender || '');
    }
  };

  const initials =
    profile?.displayName?.charAt(0)?.toUpperCase() ||
    profile?.email?.charAt(0)?.toUpperCase() ||
    'U';
  const roleDisplay = profile?.roles?.join(', ') || '—';

  if (isLoading) {
    return (
      <DashboardLayout>
        <Loading />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-primary">Cài đặt</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Quản lý chi tiết tài khoản và hệ thống của bạn
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Profile Settings */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-foreground">Cài đặt Hồ sơ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative size-28 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                    {profile?.pictureUrl ? (
                      <img
                        src={profile.pictureUrl}
                        alt="Avatar"
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-full rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                        {initials}
                      </div>
                    )}
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary rounded-full size-7 flex items-center justify-center shadow-sm border border-background">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    </div>
                  </div>
                  <button className="text-sm font-semibold text-primary hover:underline">
                    Tải ảnh lên
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Tên hiển thị
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Vai trò
                  </Label>
                  <Input value={roleDisplay} disabled className="h-10 bg-muted/50" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Số điện thoại
                  </Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Email
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={profile?.email || ''}
                      disabled
                      className="h-10 flex-1 bg-muted/50"
                    />
                    <div className="flex items-center gap-2 text-green-500">
                      <span className="material-symbols-outlined text-sm ">mail</span>
                      Đã xác minh
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Ngày sinh
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'h-10 w-full justify-start text-left font-normal',
                            !dateOfBirth && 'text-muted-foreground',
                          )}
                        >
                          <span className="material-symbols-outlined mr-2 text-[18px]">
                            calendar_today
                          </span>
                          {dateOfBirth ? (
                            new Date(dateOfBirth).toLocaleDateString('vi-VN')
                          ) : (
                            <span>Chọn ngày sinh</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CustomCalendar
                          value={dateOfBirth ? new Date(dateOfBirth) : undefined}
                          onChange={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, '0');
                              const d = String(date.getDate()).padStart(2, '0');
                              setDateOfBirth(`${y}-${m}-${d}`);
                            } else {
                              setDateOfBirth('');
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Giới tính
                    </Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Nam</SelectItem>
                        <SelectItem value="Female">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account & Security */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-foreground">
                  Tài khoản & Bảo mật
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Mật khẩu</Label>
                  <Button
                    variant="outline"
                    className="h-9 gap-2"
                    onClick={() => setIsChangePasswordOpen(true)}
                  >
                    <span className="material-symbols-outlined text-sm">key</span>
                    Đổi mật khẩu
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Quản lý thiết bị đăng nhập:</Label>
                  <button className="text-sm font-medium text-primary hover:underline">
                    Xem phiên kết nối (Thiết bị đang chạy)
                  </button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex gap-1 items-center">
                      Xác thực hai yếu tố (2FA)
                      <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                        info
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground italic">
                      Bảo mật bổ sung qua OTP / Email
                    </p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex gap-1 items-center">
                      Cảnh báo đăng nhập
                      <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                        info
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground italic">
                      Thông báo đăng nhập ở thiết bị mới
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex w-full items-center justify-between">
                    <Label className="text-sm font-bold text-destructive">Đăng xuất hệ thống</Label>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleLogout}
                      className="h-8 rounded-full px-4 gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      Đăng xuất
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Actions */}
            <Card className="border-border shadow-sm bg-muted/20">
              <CardContent className="p-4 flex sm:flex-row flex-col items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">Xác nhận áp dụng cài đặt mới</p>
                  <p className="text-xs text-muted-foreground">
                    Vui lòng kiểm tra lại thông tin trước khi Lưu
                  </p>
                </div>
                <div className="flex gap-3 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <Button
                    variant="outline"
                    className="h-10 flex-1 sm:flex-none"
                    onClick={handleReset}
                  >
                    Hủy
                  </Button>
                  <Button
                    className="h-10 bg-primary flex-1 sm:flex-none"
                    onClick={handleSaveProfile}
                    disabled={updateProfileStatus === 'pending'}
                  >
                    {updateProfileStatus === 'pending' ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-6">
            {/* Notification Settings */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-foreground">
                  Cài đặt Thông báo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Kênh thông báo
                      <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                        info
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground italic">Email & SMS</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Lịch trình</Label>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Tư vấn / Thảo luận</Label>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Kết quả / Cập nhật trạng thái</Label>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Cảnh báo đăng nhập
                      <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                        info
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground italic">
                      Nhận cảnh báo đăng nhập lạ
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        Không làm phiền
                        <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                          info
                        </span>
                      </Label>
                      <p className="text-xs text-muted-foreground italic">
                        Tắt thông báo trong khung giờ nhất định
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Từ:</Label>
                    <Input type="time" defaultValue="22:00" className="h-9 bg-background w-full" />
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Đến:</Label>
                    <Input type="time" defaultValue="07:00" className="h-9 bg-background w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-foreground">
                  Dữ liệu & Quyền riêng tư
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        Quyền truy cập dữ liệu hệ thống
                        <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                          info
                        </span>
                      </Label>
                      <p className="text-xs text-muted-foreground italic">
                        Phân quyền xem dữ liệu cho các thành viên
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-muted-foreground cursor-pointer shrink-0 ml-4">
                      expand_less
                    </span>
                  </div>

                  {/* Member List */}
                  <div className="space-y-3 pt-1">
                    {[
                      { name: 'Zaza Gonzales', role: 'Phụ tá' },
                      { name: 'Grace White', role: 'Điều dưỡng' },
                      { name: 'Freddy Ulric', role: 'Thành viên' },
                    ].map((member, i) => (
                      <div key={i} className="flex items-center justify-between p-1">
                        <div>
                          <p className="text-sm font-semibold">{member.name}</p>
                          <p className="text-xs text-muted-foreground italic mt-0.5">
                            {member.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select defaultValue={i === 0 ? 'full' : 'view'}>
                            <SelectTrigger className="w-[125px] h-8 text-xs bg-muted/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Toàn quyền</SelectItem>
                              <SelectItem value="view">Chỉ xem</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="icon" className="size-8 shrink-0">
                            <span className="material-symbols-outlined text-[16px]">
                              more_horiz
                            </span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed bg-muted/10 h-10 hover:bg-muted/30"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Thêm thành viên
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Nhật ký hoạt động
                      <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                        info
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground italic">
                      Theo dõi lịch sử truy cập và xuất dữ liệu
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      Định dạng báo cáo
                      <span className="material-symbols-outlined text-[14px] text-muted-foreground">
                        info
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground italic">
                      Định dạng tệp khi tải xuống
                    </p>
                  </div>
                  <Select defaultValue="pdf">
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between pt-1">
                  <Label className="text-sm font-bold">Chính sách & Điều khoản</Label>
                  <button className="text-sm font-medium text-primary hover:underline">
                    Xem tài liệu pháp lý
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </DashboardLayout>
  );
}
