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
import type { ReliefAdvancedFiltersValue } from '@/components/shared/relief-distribution/types';
import { ReliefAdvancedFilters } from '@/components/shared/relief-distribution/ReliefAdvancedFilters';

const parseIsoToDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const clampScheduledDate = (value: Date, campaignStartDate?: string, campaignEndDate?: string) => {
  const next = new Date(value);
  const start = parseIsoToDate(campaignStartDate);
  const end = parseIsoToDate(campaignEndDate);

  if (start && next < start) return new Date(start);
  if (end && next > end) return new Date(end);
  return next;
};

import type { CampaignHouseholdResponse } from '@/services/reliefDistributionService';
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
  filtersValue,
  onChangeFilters,
  onResetFilters,
  filtersExpanded,
  onFiltersExpandedChange,
  onJumpToCreateTeam,
  onJumpToCreatePackage,
  assignErrors,
  onEditHousehold,
  onDeleteHousehold,
  onUpdateStatusHousehold,
  distributionPoints = [],
  selectedDistributionPointId = '',
  onSelectedDistributionPointIdChange,
  campaignStartDate,
  campaignEndDate,
}: {
  sectionId: string;
  assignForm: CoordinatorAssignForm;
  onChangeAssignForm: (updater: (prev: CoordinatorAssignForm) => CoordinatorAssignForm) => void;
  teams: TeamRow[];
  packages: PackageRow[];
  households: CampaignHouseholdResponse[];
  selectedHouseholdIds: Set<string>;
  assignedTeamNameByHouseholdId: Record<string, string>;
  onToggleHousehold: (household: CampaignHouseholdResponse) => void;
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
  filtersValue: ReliefAdvancedFiltersValue;
  onChangeFilters: (next: ReliefAdvancedFiltersValue) => void;
  onResetFilters: () => void;
  filtersExpanded: boolean;
  onFiltersExpandedChange: (expanded: boolean) => void;
  onJumpToCreateTeam: () => void;
  onJumpToCreatePackage: () => void;
  assignErrors: Record<string, string>;
  onEditHousehold: (household: CampaignHouseholdResponse) => void;
  onDeleteHousehold: (household: CampaignHouseholdResponse) => void;
  onUpdateStatusHousehold: (household: CampaignHouseholdResponse) => void;
  distributionPoints?: { label: string; value: string }[];
  selectedDistributionPointId?: string;
  onSelectedDistributionPointIdChange: (value: string) => void;
  campaignStartDate?: string;
  campaignEndDate?: string;
}) {
  const hasTeams = teams.length > 0;
  const [openScheduleCalendar, setOpenScheduleCalendar] = useState(false);
  const [openActionSheet, setOpenActionSheet] = useState(false);

  return (
    <Card id={sectionId} className="shadow-sm scroll-mt-24">
      <CardHeader className="space-y-1">
        <CardTitle>Gán hộ dân</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasTeams && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-700 dark:bg-amber-950/20">
            <div>
              <p className="font-medium">Chiến dịch chưa có đội phụ trách</p>
              <p className="text-sm text-muted-foreground">
                Bước gán hộ đang tạm khóa. Hãy sang trang Quản lý đội để tạo đội hoặc gắn đội vào
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
            <p className="font-medium text-foreground">Thiết lập phân công</p>
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
                <SheetTitle>Thiết lập phân công</SheetTitle>
                <SheetDescription>Chọn đội, gói hỗ trợ, thời gian và ghi chú.</SheetDescription>
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
                      <SelectValue placeholder="Chọn đội phụ trách" />
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

                {hasPickupHouseholds && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Điểm phát cho hộ nhận tại điểm</p>
                    <Select
                      value={selectedDistributionPointId || 'none'}
                      onValueChange={(value) =>
                        onSelectedDistributionPointIdChange(value === 'none' ? '' : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn điểm phát" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không chọn</SelectItem>
                        {distributionPoints.map((point) => (
                          <SelectItem key={point.value} value={point.value}>
                            {point.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignErrors.distributionPointId && (
                      <p className="text-sm text-destructive">{assignErrors.distributionPointId}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Thời gian thực hiện</p>
                  {(campaignStartDate || campaignEndDate) && (
                    <p className="text-xs text-muted-foreground">
                      Chỉ được chọn trong thời gian chiến dịch:
                      {campaignStartDate
                        ? ` từ ${parseIsoToDate(campaignStartDate)?.toLocaleString('vi-VN')}`
                        : ''}
                      {campaignEndDate
                        ? ` đến ${parseIsoToDate(campaignEndDate)?.toLocaleString('vi-VN')}`
                        : ''}
                    </p>
                  )}
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
                            disabledDays={{ before: new Date() }}
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
                              const clamped = clampScheduledDate(
                                date,
                                campaignStartDate,
                                campaignEndDate,
                              );
                              onChangeAssignForm((prev) => ({
                                ...prev,
                                scheduledAt: clamped.toISOString(),
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
                        const clamped = clampScheduledDate(
                          base,
                          campaignStartDate,
                          campaignEndDate,
                        );
                        onChangeAssignForm((prev) => ({
                          ...prev,
                          scheduledAt: clamped.toISOString(),
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

                <div className="space-y-3 pt-2">
                  {!canAssign && (
                    <div className="flex flex-col text-xs text-destructive font-medium">
                      {selectionCount === 0 && <span>• Vui lòng chọn ít nhất một hộ dân</span>}
                      {!assignForm.campaignTeamId && <span>• Vui lòng chọn đội phụ trách</span>}
                      {!assignForm.reliefPackageDefinitionId && (
                        <span>• Vui lòng chọn gói cứu trợ</span>
                      )}
                      {!assignForm.scheduledAt && <span>• Vui lòng chọn ngày gán</span>}
                      {hasPickupHouseholds && !hasDistributionPoint && (
                        <span>• Hộ nhận tại điểm phát yêu cầu chiến dịch có điểm phát hàng</span>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpenActionSheet(false)}
                    >
                      Đóng
                    </Button>
                    <Button
                      type="button"
                      onClick={onAssign}
                      className="gap-2"
                      disabled={!canAssign}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        assignment_turned_in
                      </span>
                      Gán hộ đã chọn
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <ReliefAdvancedFilters
          value={filtersValue}
          onChange={onChangeFilters}
          onReset={onResetFilters}
          expanded={filtersExpanded}
          onExpandedChange={onFiltersExpandedChange}
          teams={teams.map((team) => ({ label: team.teamName, value: team.campaignTeamId }))}
          distributionPoints={distributionPoints}
          showIsolationFilter
          title="Bộ lọc điều phối phân phối"
        />

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
                <TableHead>Đội hiện tại</TableHead>
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
                  <TableRow
                    key={household.campaignHouseholdId}
                    className={`hover:bg-muted/30 ${hasTeams ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (!hasTeams) return;
                      onToggleHousehold(household);
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        disabled={!hasTeams}
                        checked={selectedHouseholdIds.has(household.campaignHouseholdId)}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() => onToggleHousehold(household)}
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
                          'Chưa gán đội'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            onUpdateStatusHousehold(household);
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                          Trạng thái
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditHousehold(household);
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Sửa
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteHousehold(household);
                          }}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
