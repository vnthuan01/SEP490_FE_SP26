import type { CheckedState } from '@radix-ui/react-checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import CustomCalendar from '@/components/ui/customCalendar';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getDeliveryModeBadgeVariant,
  getDeliveryModeLabel,
  getHouseholdFulfillmentStatusBadgeVariant,
  getHouseholdFulfillmentStatusLabel,
} from '@/enums/beEnums';
import type { CoordinatorAssignForm } from './types';

const parseIsoToDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

type HouseholdRow = {
  campaignHouseholdId: string;
  householdCode: string;
  headOfHouseholdName: string;
  contactPhone?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  householdSize: number;
  isIsolated: boolean;
  deliveryMode: number;
  fulfillmentStatus: number;
  notes?: string | null;
  campaignTeamId?: string | null;
};

type TeamRow = { campaignTeamId: string; teamName: string };
type PackageRow = { reliefPackageDefinitionId: string; name: string };

export function CoordinatorReliefDistributionAssignmentStep({
  sectionId,
  assignForm,
  onChangeAssignForm,
  teams,
  packages,
  households,
  selectedHouseholdIds,
  assignedTeamNameByHouseholdId,
  onToggleHousehold,
  allPageSelected,
  onToggleSelectAll,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  selectionCount,
  canAssign,
  onAssign,
  hasPickupHouseholds,
  hasDistributionPoint,
  householdSearch,
  onChangeHouseholdSearch,
  assignmentFilter,
  onChangeAssignmentFilter,
  onJumpToCreateTeam,
  onJumpToCreatePackage,
  assignErrors,
  onEditHousehold,
  onDeleteHousehold,
}: {
  sectionId: string;
  assignForm: CoordinatorAssignForm;
  onChangeAssignForm: (updater: (prev: CoordinatorAssignForm) => CoordinatorAssignForm) => void;
  teams: TeamRow[];
  packages: PackageRow[];
  households: HouseholdRow[];
  selectedHouseholdIds: Set<string>;
  assignedTeamNameByHouseholdId: Record<string, string>;
  onToggleHousehold: (id: string) => void;
  allPageSelected: boolean;
  onToggleSelectAll: (checked: CheckedState) => void;
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  selectionCount: number;
  canAssign: boolean;
  onAssign: () => void;
  hasPickupHouseholds: boolean;
  hasDistributionPoint: boolean;
  householdSearch: string;
  onChangeHouseholdSearch: (value: string) => void;
  assignmentFilter: 'all' | 'assigned' | 'unassigned';
  onChangeAssignmentFilter: (value: 'all' | 'assigned' | 'unassigned') => void;
  onJumpToCreateTeam: () => void;
  onJumpToCreatePackage: () => void;
  assignErrors: Record<string, string>;
  onEditHousehold: (household: HouseholdRow) => void;
  onDeleteHousehold: (household: HouseholdRow) => void;
}) {
  const hasTeams = teams.length > 0;
  const [openScheduleCalendar, setOpenScheduleCalendar] = useState(false);
  const [openActionSheet, setOpenActionSheet] = useState(false);

  return (
    <Card id={sectionId} className="shadow-sm scroll-mt-24">
      <CardHeader className="space-y-1">
        <CardTitle>Bước 4. Gán hộ dân</CardTitle>
        <p className="text-sm text-muted-foreground">
          Chọn đội phụ trách, gói hỗ trợ và thời gian thực hiện để gán cho các hộ dân đã chọn.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasTeams && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-700 dark:bg-amber-950/20">
            <div>
              <p className="font-medium">Chiến dịch chưa có đội phụ trách</p>
              <p className="text-sm text-muted-foreground">
                Bước gán hộ đang tạm khóa. Hãy sang Team Management để tạo đội hoặc gắn đội vào
                chiến dịch, sau đó quay lại để phân công hộ dân.
              </p>
            </div>
            <div>
              <Button
                type="button"
                variant="primary"
                onClick={onJumpToCreateTeam}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                Đi tới quản lý đội
              </Button>
            </div>
          </div>
        )}

        {packages.length === 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
            <div>
              <p className="font-medium">Chưa có gói hỗ trợ</p>
              <p className="text-sm text-muted-foreground">
                Hãy tạo gói hỗ trợ trước khi phân công cho các hộ dân đã chọn.
              </p>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={onJumpToCreatePackage}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                Quay lại bước tạo gói
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-foreground">Thiết lập gán hộ</p>
            <p className="text-sm text-muted-foreground">
              Gom toàn bộ chọn đội, gói hỗ trợ, lịch phát và ghi chú vào một sheet để giao diện gọn
              hơn.
            </p>
          </div>
          <Sheet open={openActionSheet} onOpenChange={setOpenActionSheet}>
            <SheetTrigger asChild>
              <Button type="button" variant="primary" className="gap-2">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Mở thiết lập
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Thiết lập gán hộ dân</SheetTitle>
                <SheetDescription>
                  Chọn đội phụ trách, gói hỗ trợ, lịch bắt đầu và ghi chú cho đợt gán hộ hiện tại.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Đội phụ trách</p>
                  <Select
                    value={assignForm.campaignTeamId || 'none'}
                    onValueChange={(value) =>
                      onChangeAssignForm((prev) => ({
                        ...prev,
                        campaignTeamId: value === 'none' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger disabled={!hasTeams}>
                      <SelectValue placeholder="Chọn team phụ trách" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không chọn</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.campaignTeamId} value={team.campaignTeamId}>
                          {team.teamName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignErrors.campaignTeamId && (
                    <p className="text-sm text-destructive">{assignErrors.campaignTeamId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Gói hỗ trợ</p>
                  <Select
                    value={assignForm.reliefPackageDefinitionId || 'none'}
                    onValueChange={(value) =>
                      onChangeAssignForm((prev) => ({
                        ...prev,
                        reliefPackageDefinitionId: value === 'none' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger disabled={!hasTeams}>
                      <SelectValue placeholder="Chọn gói cứu trợ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không chọn</SelectItem>
                      {packages.map((pkg) => (
                        <SelectItem
                          key={pkg.reliefPackageDefinitionId}
                          value={pkg.reliefPackageDefinitionId}
                        >
                          {pkg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignErrors.reliefPackageDefinitionId && (
                    <p className="text-sm text-destructive">
                      {assignErrors.reliefPackageDefinitionId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Thời gian thực hiện</p>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2 font-normal"
                        onClick={() => setOpenScheduleCalendar((prev) => !prev)}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          calendar_month
                        </span>
                        {parseIsoToDate(assignForm.scheduledAt)?.toLocaleDateString('vi-VN') ||
                          'Chọn ngày'}
                      </Button>
                      {openScheduleCalendar && (
                        <div className="absolute left-0 z-50 mt-2 rounded-xl border border-border bg-background p-3 shadow-lg">
                          <CustomCalendar
                            value={parseIsoToDate(assignForm.scheduledAt)}
                            onChange={(date) => {
                              if (!date) return;
                              const current = parseIsoToDate(assignForm.scheduledAt) || new Date();
                              date.setHours(
                                current.getHours() || 8,
                                current.getMinutes() || 0,
                                0,
                                0,
                              );
                              onChangeAssignForm((prev) => ({
                                ...prev,
                                scheduledAt: date.toISOString(),
                              }));
                              setOpenScheduleCalendar(false);
                            }}
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenScheduleCalendar(false)}
                            >
                              Thu gọn
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      className="mt-3"
                      type="time"
                      value={
                        assignForm.scheduledAt
                          ? new Date(assignForm.scheduledAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })
                          : '08:00'
                      }
                      disabled={!hasTeams}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const base = parseIsoToDate(assignForm.scheduledAt) || new Date();
                        base.setHours(hours || 0, minutes || 0, 0, 0);
                        onChangeAssignForm((prev) => ({
                          ...prev,
                          scheduledAt: base.toISOString(),
                        }));
                      }}
                    />
                  </div>
                  {assignErrors.scheduledAt && (
                    <p className="text-sm text-destructive">{assignErrors.scheduledAt}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Ghi chú</p>
                  <Textarea
                    placeholder="Ví dụ: Ưu tiên thực hiện trong buổi sáng"
                    value={assignForm.notes}
                    disabled={!hasTeams}
                    onChange={(e) =>
                      onChangeAssignForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                  {assignErrors.notes && (
                    <p className="text-sm text-destructive">{assignErrors.notes}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setOpenActionSheet(false)} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Xong
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2 xl:col-span-2">
            <p className="text-sm font-medium">Tìm kiếm hộ dân</p>
            <Input
              placeholder="Tìm theo mã hộ hoặc tên chủ hộ"
              value={householdSearch}
              onChange={(e) => onChangeHouseholdSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Lọc theo trạng thái gán</p>
            <Select
              value={assignmentFilter}
              onValueChange={(value: 'all' | 'assigned' | 'unassigned') =>
                onChangeAssignmentFilter(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Lọc theo phân công" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="assigned">Đã gán team</SelectItem>
                <SelectItem value="unassigned">Chưa gán team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasPickupHouseholds && !hasDistributionPoint && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Có hộ dân nhận tại điểm phát nhưng chiến dịch chưa có điểm phát nào. Hãy tạo điểm phát
            trước khi gán hộ.
          </p>
        )}

        {assignErrors.selectedHouseholds && (
          <p className="text-sm text-destructive">{assignErrors.selectedHouseholds}</p>
        )}

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12">
                  <Checkbox checked={allPageSelected} onCheckedChange={onToggleSelectAll} />
                </TableHead>
                <TableHead>Mã hộ</TableHead>
                <TableHead>Chủ hộ</TableHead>
                <TableHead>Hình thức nhận</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Team hiện tại</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {households.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Không có hộ dân phù hợp bộ lọc hiện tại.
                  </TableCell>
                </TableRow>
              ) : (
                households.map((household) => (
                  <TableRow key={household.campaignHouseholdId} className="hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        disabled={!hasTeams}
                        checked={selectedHouseholdIds.has(household.campaignHouseholdId)}
                        onCheckedChange={() => onToggleHousehold(household.campaignHouseholdId)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{household.householdCode}</TableCell>
                    <TableCell>{household.headOfHouseholdName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getDeliveryModeBadgeVariant(household.deliveryMode)}
                        appearance="light"
                      >
                        {getDeliveryModeLabel(household.deliveryMode)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getHouseholdFulfillmentStatusBadgeVariant(
                          household.fulfillmentStatus,
                        )}
                        appearance="light"
                      >
                        {getHouseholdFulfillmentStatusLabel(household.fulfillmentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assignedTeamNameByHouseholdId[household.campaignHouseholdId]
                            ? 'success'
                            : 'outline'
                        }
                        appearance="light"
                      >
                        {assignedTeamNameByHouseholdId[household.campaignHouseholdId] ||
                          'Chưa gán team'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => onEditHousehold(household)}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Sửa
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          onClick={() => onDeleteHousehold(household)}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Xoá
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Đã chọn {selectionCount} hộ dân · Trang {currentPage}/{totalPages}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onPreviousPage} disabled={currentPage === 1}>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              Trang trước
            </Button>
            <Button variant="outline" onClick={onNextPage} disabled={currentPage === totalPages}>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              Trang sau
            </Button>
            <Button onClick={onAssign} disabled={!canAssign} className="gap-2">
              <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
              Gán hộ đã chọn
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
