import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordDialog } from '@/pages/user/components/ChangePasswordDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';

import { roleLabelMap } from '@/constants/roleLabel';
import type { UserRoleType } from '@/enums/UserRole';
import { toast } from 'sonner';
import { InfoRow } from '@/components/ui/infoRow';
import { FormRow } from '@/components/ui/formRow';

type ProfileFormValues = {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  province: string;
  bio: string;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      address: user?.address || '',
      city: user?.city || '',
      province: user?.province || '',
      bio: user?.bio || '',
    },
  });

  const handleSave = async (values: ProfileFormValues) => {
    try {
      console.log(values);
      toast.success('Cập nhật hồ sơ thành công');
      setIsEditing(false);
    } catch {
      toast.error('Cập nhật hồ sơ thất bại');
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const initials = user?.fullName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Header giống Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Hồ sơ cá nhân</h1>
            <p className="text-muted-foreground">Xem và chỉnh sửa thông tin cá nhân của bạn</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full font-bold border-2"
              onClick={() => navigate('/portal/settings')}
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              Cài đặt
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="rounded-full font-bold border-2"
              onClick={() => setIsChangePasswordOpen(true)}
            >
              <span className="material-symbols-outlined text-lg">lock</span>
              Đổi mật khẩu
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="overflow-hidden">
          {/* Cover */}
          <div className="relative h-32 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/30">
            <div className="absolute -bottom-12 left-8">
              <div
                className={`size-24 rounded-2xl border-4 border-background shadow-lg flex items-center justify-center text-3xl font-bold ${
                  user?.avatarUrl ? '' : 'bg-primary text-primary-foreground'
                }`}
                style={{
                  backgroundImage: user?.avatarUrl ? `url("${user.avatarUrl}")` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!user?.avatarUrl && initials}
              </div>
            </div>
          </div>

          <CardHeader className="pt-16 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">
                {user?.fullName || 'Chưa cập nhật'}
              </CardTitle>

              <p className="text-sm text-muted-foreground">{user?.email}</p>

              <Badge variant="secondary" className="m-2">
                {roleLabelMap[user?.role as UserRoleType] || user?.role || 'Người dùng'}
              </Badge>
            </div>

            {!isEditing ? (
              <Button
                size="lg"
                className="bg-primary text-white gap-2 font-bold rounded-full"
                onClick={() => setIsEditing(true)}
              >
                <span className="material-symbols-outlined">edit</span>
                Chỉnh sửa
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Hủy
                </Button>

                <Button onClick={form.handleSubmit(handleSave)}>
                  <span className="material-symbols-outlined mr-1">save</span>
                  Lưu
                </Button>
              </div>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="py-6">
            {isEditing ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSave)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormRow
                          icon="person"
                          label="Họ và tên"
                          description="Tên hiển thị của bạn trong hệ thống"
                        >
                          <FormControl>
                            <Input {...field} placeholder="Nguyễn Văn A" />
                          </FormControl>
                        </FormRow>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormRow icon="email" label="Email" description="Email dùng để đăng nhập">
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                        </FormRow>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormRow
                          icon="phone"
                          label="Số điện thoại"
                          description="Dùng để liên hệ khẩn cấp"
                        >
                          <FormControl>
                            <Input {...field} placeholder="090xxxxxxx" />
                          </FormControl>
                        </FormRow>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormRow
                          icon="location_on"
                          label="Địa chỉ"
                          description="Địa chỉ nơi bạn sinh sống"
                        >
                          <FormControl>
                            <Input {...field} placeholder="123 Nguyễn Trãi" />
                          </FormControl>
                        </FormRow>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormRow
                          icon="location_city"
                          label="Thành phố"
                          description="Thành phố bạn đang sống"
                        >
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormRow>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormRow icon="map" label="Tỉnh / Thành" description="Tỉnh hoặc thành phố">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormRow>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormRow
                          icon="info"
                          label="Giới thiệu"
                          description="Một vài dòng mô tả về bạn"
                        >
                          <FormControl>
                            <Input {...field} placeholder="Tôi là tình nguyện viên..." />
                          </FormControl>
                        </FormRow>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow icon="person" label="Họ và tên" value={user?.fullName} />
                <InfoRow icon="email" label="Email" value={user?.email} />
                <InfoRow icon="phone" label="SĐT" value={user?.phoneNumber} />
                <InfoRow icon="location_on" label="Địa chỉ" value={user?.address} />
                <InfoRow icon="location_city" label="Thành phố" value={user?.city} />
                <InfoRow icon="map" label="Tỉnh" value={user?.province} />
                <InfoRow
                  icon="info"
                  label="Giới thiệu"
                  value={user?.bio}
                  className="md:col-span-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </DashboardLayout>
  );
}
