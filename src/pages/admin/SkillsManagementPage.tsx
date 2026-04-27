import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { adminNavItems, adminProjects } from './components/sidebarConfig';
import { useSkills } from '@/hooks/useSkills';
import { parseApiError } from '@/lib/apiErrors';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Skill } from '@/services/skillsService';

function slugifyCode(value: string) {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();

  if (!base) return `SKILL_${Date.now()}`;
  return `SKILL_${base.slice(0, 24)}`;
}

export default function SkillsManagementPage() {
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);

  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const params = useMemo(
    () => ({
      pageIndex,
      pageSize,
      search: search.trim() || undefined,
    }),
    [pageIndex, pageSize, search],
  );

  const {
    skills,
    skillsPagination,
    isLoadingSkills,
    createSkill,
    createStatus,
    updateSkill,
    updateStatus,
  } = useSkills(undefined, params);

  const openEditModal = (skill: Skill) => {
    setEditingSkill(skill);
    setEditName(skill.name);
    setEditDescription(skill.description || '');
  };

  const resetCreateForm = () => {
    setCreateCode('');
    setCreateName('');
    setCreateDescription('');
  };

  const handleCreateSkill = async () => {
    const name = createName.trim();
    const description = createDescription.trim();

    if (!name || !description) {
      toast.error('Vui lòng nhập đầy đủ tên kỹ năng và mô tả');
      return;
    }

    try {
      await createSkill({
        code: createCode.trim() || slugifyCode(name),
        name,
        description,
      });
      toast.success('Tạo kỹ năng mới thành công');
      resetCreateForm();
      setPageIndex(1);
    } catch (error) {
      toast.error(parseApiError(error, 'Không thể tạo kỹ năng').message);
    }
  };

  const handleUpdateSkill = async () => {
    if (!editingSkill) return;

    const name = editName.trim();
    const description = editDescription.trim();

    if (!name || !description) {
      toast.error('Vui lòng nhập đầy đủ tên kỹ năng và mô tả');
      return;
    }

    try {
      await updateSkill({
        id: editingSkill.skillId,
        data: {
          name,
          description,
        },
      });
      toast.success('Cập nhật kỹ năng thành công');
      setEditingSkill(null);
    } catch (error) {
      toast.error(parseApiError(error, 'Không thể cập nhật kỹ năng').message);
    }
  };

  const totalPages = Math.max(skillsPagination?.totalPages || 1, 1);

  return (
    <DashboardLayout projects={adminProjects} navItems={adminNavItems}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Quản lý kỹ năng</h1>
            <p className="text-muted-foreground mt-2">
              Quản trị danh sách kỹ năng dùng cho phân quyền nghiệp vụ, điều phối nhân sự và cấu
              hình dữ liệu nền.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tạo kỹ năng mới</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="skill-name">Tên kỹ năng *</Label>
                <Input
                  id="skill-name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Ví dụ: Sơ cứu y tế"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-code">Mã kỹ năng (tùy chọn)</Label>
                <Input
                  id="skill-code"
                  value={createCode}
                  onChange={(event) => setCreateCode(event.target.value)}
                  placeholder="Ví dụ: SKILL_FIRST_AID"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-description">Mô tả *</Label>
              <Textarea
                id="skill-description"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="Mô tả ngắn về kỹ năng"
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => void handleCreateSkill()}
                disabled={createStatus === 'pending'}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                {createStatus === 'pending' ? 'Đang tạo...' : 'Tạo kỹ năng'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Danh sách kỹ năng</CardTitle>
              <Input
                className="sm:max-w-sm"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPageIndex(1);
                }}
                placeholder="Tìm theo tên kỹ năng"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSkills ? (
              <div className="py-10 text-center text-muted-foreground">
                Đang tải danh sách kỹ năng...
              </div>
            ) : skills.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Chưa có kỹ năng nào</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map((skill) => (
                    <TableRow key={skill.skillId}>
                      <TableCell className="font-semibold">{skill.name}</TableCell>
                      <TableCell>{skill.code || '—'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[500px] truncate">
                        {skill.description || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(skill)}>
                          <span className="material-symbols-outlined text-sm">edit</span>
                          Chỉnh sửa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Trang {skillsPagination?.currentPage || 1} / {totalPages} • Tổng{' '}
                {skillsPagination?.totalCount || 0} kỹ năng
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(skillsPagination?.currentPage || 1) <= 1}
                  onClick={() => setPageIndex((prev) => Math.max(prev - 1, 1))}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(skillsPagination?.currentPage || 1) >= totalPages}
                  onClick={() => setPageIndex((prev) => Math.min(prev + 1, totalPages))}
                >
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editingSkill} onOpenChange={(open) => !open && setEditingSkill(null)}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa kỹ năng</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin kỹ năng đang được sử dụng trong hệ thống.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <Label htmlFor="edit-skill-name">Tên kỹ năng *</Label>
                <Input
                  id="edit-skill-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill-description">Mô tả *</Label>
                <Textarea
                  id="edit-skill-description"
                  rows={4}
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSkill(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleUpdateSkill()}
                disabled={updateStatus === 'pending'}
              >
                {updateStatus === 'pending' ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
