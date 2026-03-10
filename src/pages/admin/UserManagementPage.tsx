import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRole, type UserRoleType } from '@/enums/UserRole';
import { roleVariantMap } from '@/constants/roleVariant';
import { roleLabelMap } from '@/constants/roleLabel';
import type { User } from '@/services/authService';
import { useState } from 'react';
import { AddUserModal } from './components/AddUserModal';

export const mockUsers: User[] = [
  {
    id: '1',
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@relief.vn',
    role: UserRole.Admin,
    status: 'active',
    lastActivity: 'Vừa xong',
    location: 'IP: 192.168.1.1',
  },
  {
    id: '2',
    fullName: 'Trần Thị B',
    email: 'tranthib@gmail.com',
    role: UserRole.Coordinator,
    status: 'active',
    lastActivity: '25 phút trước',
    location: 'Hà Nội',
  },
  {
    id: '3',
    fullName: 'Lê Văn C',
    email: 'levanc@edu.vn',
    role: UserRole.Volunteer,
    status: 'offline',
    lastActivity: '2 ngày trước',
    location: 'Đà Nẵng',
  },
  {
    id: '4',
    fullName: 'Phạm Tùng',
    email: 'tungpham@gmail.com',
    role: UserRole.Volunteer,
    status: 'pending',
    lastActivity: 'Chưa đăng nhập',
    location: '-',
  },
  {
    id: '5',
    fullName: 'Hoàng My',
    email: 'myhoang@relief.vn',
    role: UserRole.Coordinator,
    status: 'active',
    lastActivity: '1 giờ trước',
    location: 'Quảng Bình',
  },
];

export default function AdminUserManagementPage() {
  const [openAddUser, setOpenAddUser] = useState(false);

  const handleCreateUser = async () => {
    // await createUser(data);
    console.log('Đã tạo user thành công');
    // TODO: refetch user list / toast success
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-primary ">
            Quản lý người dùng & phân quyền
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground text-base font-normal max-w-2xl">
            Trung tâm quản lý người dùng, cấu hình vai trò, phân quyền truy cập và theo dõi nhật ký
            hoạt động của toàn hệ thống cứu trợ.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="md" className="gap-2">
            <span className="material-symbols-outlined text-lg">download</span>
            <span>Xuất dữ liệu</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={() => setOpenAddUser(true)}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Thêm người dùng</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-surface-dark dark:bg-surface-light border-border">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-medium uppercase tracking-wider">
                Tổng người dùng
              </p>
              <span className="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">
                groups
              </span>
            </div>
            <div className="flex items-end gap-3 mt-2">
              <p className="text-foreground dark:text-foreground text-3xl font-bold leading-none">
                1,240
              </p>
              <div className="flex items-center text-green-500 text-sm font-medium bg-green-500/10 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-sm mr-0.5">trending_up</span>
                <span>5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark dark:bg-surface-light border-border">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-medium uppercase tracking-wider">
                Tình nguyện viên Active
              </p>
              <span className="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">
                volunteer_activism
              </span>
            </div>
            <div className="flex items-end gap-3 mt-2">
              <p className="text-foreground dark:text-foreground text-3xl font-bold leading-none">
                850
              </p>
              <div className="flex items-center text-green-500 text-sm font-medium bg-green-500/10 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-sm mr-0.5">trending_up</span>
                <span>12%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-dark dark:bg-surface-light border-border">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground dark:text-muted-foreground text-sm font-medium uppercase tracking-wider">
                Admin đang online
              </p>
              <span className="material-symbols-outlined text-muted-foreground dark:text-muted-foreground">
                admin_panel_settings
              </span>
            </div>
            <div className="flex items-end gap-3 mt-2">
              <p className="text-foreground dark:text-foreground text-3xl font-bold leading-none">
                12
              </p>
              <span className="text-muted-foreground dark:text-muted-foreground text-sm font-medium">
                Hiện tại
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-surface-dark dark:bg-surface-light border-border">
        <Tabs defaultValue="users" className="w-full">
          <div className="border-b border-border px-4 flex overflow-x-auto">
            <TabsList className="bg-transparent">
              <TabsTrigger
                value="users"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Danh sách người dùng
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Ma trận phân quyền
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Nhật ký hệ thống (Logs)
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-b border-border bg-sub-surface-dark/50 dark:bg-sub-surface-light/50">
            <div className="relative w-full sm:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground dark:text-muted-foreground">
                search
              </span>
              <Input className="pl-10 w-full" placeholder="Tìm kiếm theo tên, email, SĐT..." />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-3">
              <Button variant="outline" size="md" className="gap-2 min-w-[140px] justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">filter_list</span>
                  Vai trò: Tất cả
                </span>
                <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
              </Button>
              <Button variant="outline" size="md" className="gap-2 min-w-[140px] justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">toggle_on</span>
                  Trạng thái
                </span>
                <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
              </Button>
            </div>
          </div>

          <TabsContent value="users" className="m-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hoạt động cuối</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="group hover:bg-card/50 dark:hover:bg-card/50 transition-colors"
                    >
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-card dark:bg-card border border-border flex items-center justify-center">
                            <span className="text-foreground dark:text-foreground font-bold text-sm">
                              {user.fullName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-foreground dark:text-foreground text-sm">
                              {user.fullName}
                            </p>
                            <p className="text-xs text-text-muted-dark dark:text-text-muted-light">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge size="xs" variant={roleVariantMap[user.role as UserRoleType]}>
                          {roleLabelMap[user.role as UserRoleType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-2 rounded-full ${
                              user.status === 'active'
                                ? 'bg-green-500 animate-pulse'
                                : user.status === 'pending'
                                  ? 'bg-orange-400'
                                  : 'bg-text-sub-dark dark:bg-text-sub-light'
                            }`}
                          ></div>
                          <span className="text-foreground dark:text-foreground text-sm">
                            {user.status === 'active'
                              ? 'Hoạt động'
                              : user.status === 'pending'
                                ? 'Chờ duyệt'
                                : 'Offline'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-foreground dark:text-foreground text-sm">
                            {user.lastActivity}
                          </span>
                          <span className="text-xs text-text-muted-dark dark:text-text-muted-light">
                            {user.location}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="permissions">
            <div className="p-6 text-center text-muted-foreground dark:text-muted-foreground">
              Ma trận phân quyền - Coming soon
            </div>
          </TabsContent>
          <TabsContent value="logs">
            <div className="p-6 text-center text-muted-foreground dark:text-muted-foreground">
              Nhật ký hệ thống - Coming soon
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      <AddUserModal
        open={openAddUser}
        onClose={() => setOpenAddUser(false)}
        onSubmit={handleCreateUser}
      />
    </DashboardLayout>
  );
}
