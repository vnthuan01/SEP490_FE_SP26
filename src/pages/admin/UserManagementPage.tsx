import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { type UserRoleType } from '@/enums/UserRole';
import { roleVariantMap } from '@/constants/roleVariant';
import { roleLabelMap } from '@/constants/roleLabel';
import { useState } from 'react';
import { AddUserModal } from './components/AddUserModal';
import { useAllUsers } from '@/hooks/useUsers';
import { StatsCard } from '@/pages/admin/components/StatsCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBanUser, useUnbanUser } from '@/hooks/useUsers';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AdminUserManagementPage() {
  const [openAddUser, setOpenAddUser] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);

  // States for Ban/Unban dialogs
  const [banUserDialog, setBanUserDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
  }>({
    open: false,
    userId: '',
    email: '',
  });
  const [banReason, setBanReason] = useState('');
  const [unbanUserDialog, setUnbanUserDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
  }>({
    open: false,
    userId: '',
    email: '',
  });

  const { users, pagination, isLoading, refetch } = useAllUsers({
    pageIndex,
    pageSize,
    search: search || undefined,
    role: roleFilter,
    isBanned: statusFilter,
  });

  const { mutateAsync: banUser } = useBanUser();
  const { mutateAsync: unbanUser } = useUnbanUser();

  const handleBanUser = async () => {
    try {
      await banUser({ userId: banUserDialog.userId, data: { reason: banReason } });
      toast.success(`Đã khóa người dùng ${banUserDialog.email}`);
      setBanUserDialog({ open: false, userId: '', email: '' });
      setBanReason('');
      refetch();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUnbanUser = async () => {
    try {
      await unbanUser({ userId: unbanUserDialog.userId, data: { note: 'Admin unbanned' } });
      toast.success(`Đã mở khóa người dùng ${unbanUserDialog.email}`);
      setUnbanUserDialog({ open: false, userId: '', email: '' });
      refetch();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateUser = async () => {
    console.log('Đã tạo user thành công');
    refetch();
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
        <StatsCard
          title="Tổng người dùng"
          value={String(pagination?.totalCount ?? '—')}
          icon="groups"
          variant="success"
        />
        <StatsCard
          title="Trang hiện tại"
          value={`${pagination?.currentPage ?? '—'} / ${pagination?.totalPages ?? '—'}`}
          icon="pages"
          variant="info"
        />
        <StatsCard
          title="Hiển thị"
          value={`${users.length} người dùng`}
          icon="visibility"
          variant="warning"
        />
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
              <Input
                className="pl-10 w-full"
                placeholder="Tìm kiếm theo tên, email, SĐT..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(1);
                }}
              />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-3">
              <Button
                variant="outline"
                size="md"
                className="gap-2 min-w-[140px] justify-between"
                onClick={() => {
                  // Giả lập chọn role, thực tế có thể dùng DropdownMenu
                  const roles = [undefined, 'Admin', 'Manager', 'Moderator', 'Volunteer'];
                  const currentIndex = roles.indexOf(roleFilter);
                  setRoleFilter(roles[(currentIndex + 1) % roles.length]);
                  setPageIndex(1);
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">filter_list</span>
                  Vai trò: {roleFilter || 'Tất cả'}
                </span>
                <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                className="gap-2 min-w-[140px] justify-between"
                onClick={() => {
                  const statuses = [undefined, true, false];
                  const currentIndex = statuses.indexOf(statusFilter);
                  setStatusFilter(statuses[(currentIndex + 1) % statuses.length]);
                  setPageIndex(1);
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">toggle_on</span>
                  {statusFilter === undefined
                    ? 'Trạng thái'
                    : statusFilter
                      ? 'Đã khóa'
                      : 'Hoạt động'}
                </span>
                <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
              </Button>
            </div>
          </div>

          <TabsContent value="users" className="m-0">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                      progress_activity
                    </span>
                    <p className="text-muted-foreground text-sm">
                      Đang tải danh sách người dùng...
                    </p>
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground">
                      person_off
                    </span>
                    <p className="text-muted-foreground text-sm">Không có người dùng nào</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox />
                      </TableHead>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="group hover:bg-card/50 dark:hover:bg-card/50 transition-colors"
                      >
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-card dark:bg-card border border-border flex items-center justify-center overflow-hidden">
                              {user.pictureUrl ? (
                                <img
                                  src={user.pictureUrl}
                                  alt={user.displayName || ''}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <span className="text-foreground dark:text-foreground font-bold text-sm">
                                  {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground dark:text-foreground text-sm">
                                {user.displayName || '—'}
                              </p>
                              <p className="text-xs text-text-muted-dark dark:text-text-muted-light">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => {
                              const variant = roleVariantMap[role as UserRoleType];
                              const label = roleLabelMap[role as UserRoleType];
                              return (
                                <Badge key={role} size="xs" variant={variant || 'default'}>
                                  {label || role}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-foreground dark:text-foreground text-sm">
                            {user.phoneNumber || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.isBanned ? (
                            <Badge variant="destructive" size="sm" className="gap-1">
                              <span className="material-symbols-outlined text-xs">block</span>
                              Đã bị khóa
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm" className="gap-1">
                              <span className="material-symbols-outlined text-xs">
                                check_circle
                              </span>
                              Đang hoạt động
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground"
                              >
                                <span className="material-symbols-outlined">more_vert</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Chỉnh sửa (Soon)
                              </DropdownMenuItem>
                              {user.isBanned ? (
                                <DropdownMenuItem
                                  className="gap-2 text-success"
                                  onClick={() =>
                                    setUnbanUserDialog({
                                      open: true,
                                      userId: user.id,
                                      email: user.email,
                                    })
                                  }
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    lock_open
                                  </span>
                                  Mở khóa tài khoản
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="gap-2 text-destructive"
                                  onClick={() =>
                                    setBanUserDialog({
                                      open: true,
                                      userId: user.id,
                                      email: user.email,
                                    })
                                  }
                                >
                                  <span className="material-symbols-outlined text-lg">block</span>
                                  Khóa tài khoản
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Trang {pagination.currentPage} / {pagination.totalPages} — Tổng{' '}
                  {pagination.totalCount} người dùng
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevious}
                    onClick={() => setPageIndex((prev) => Math.max(1, prev - 1))}
                    className="gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                    Trước
                  </Button>
                  {/* Page number buttons */}
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === pagination.currentPage ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setPageIndex(page)}
                      className="min-w-[36px]"
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNext}
                    onClick={() => setPageIndex((prev) => prev + 1)}
                    className="gap-1"
                  >
                    Sau
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </Button>
                </div>
              </div>
            )}
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

      {/* Ban User Dialog */}
      <Dialog
        open={banUserDialog.open}
        onOpenChange={(open) => !open && setBanUserDialog({ open: false, userId: '', email: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Khóa tài khoản người dùng</DialogTitle>
            <DialogDescription>
              Bạn đang thực hiện khóa tài khoản <b>{banUserDialog.email}</b>. Người dùng sẽ không
              thể đăng nhập cho đến khi được mở khóa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Lý do khóa tài khoản</Label>
              <Textarea
                id="reason"
                placeholder="Ví dụ: Vi phạm điều khoản, spam..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanUserDialog({ open: false, userId: '', email: '' })}
            >
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={!banReason}>
              Xác nhận khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban User Dialog */}
      <Dialog
        open={unbanUserDialog.open}
        onOpenChange={(open) => !open && setUnbanUserDialog({ open: false, userId: '', email: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mở khóa tài khoản</DialogTitle>
            <DialogDescription>
              Xác nhận mở khóa cho tài khoản <b>{unbanUserDialog.email}</b>? Người dùng sẽ có thể
              truy cập lại hệ thống ngay lập tức.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnbanUserDialog({ open: false, userId: '', email: '' })}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleUnbanUser}>
              Xác nhận mở khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
