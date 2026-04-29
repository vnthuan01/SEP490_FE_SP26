import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import type { ReliefAdvancedFiltersValue, SelectOption } from './types';

type ReliefAdvancedFiltersProps = {
  value: ReliefAdvancedFiltersValue;
  onChange: (next: ReliefAdvancedFiltersValue) => void;
  onReset: () => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  teams?: SelectOption[];
  distributionPoints?: SelectOption[];
  packages?: SelectOption[];
  searchPlaceholder?: string;
  showAssignmentFilter?: boolean;
  showIsolationFilter?: boolean;
  showStatusFilter?: boolean;
  title?: string;
};

export function ReliefAdvancedFilters({
  value,
  onChange,
  onReset,
  expanded,
  onExpandedChange,
  teams = [],
  distributionPoints = [],
  packages = [],
  searchPlaceholder = 'Tìm theo mã hộ hoặc tên chủ hộ',
  showAssignmentFilter = true,
  showIsolationFilter = false,
  showStatusFilter = true,
  title = 'Bộ lọc nâng cao',
}: ReliefAdvancedFiltersProps) {
  const activeFilterCount = [
    value.search.trim() ? 1 : 0,
    value.assignment && value.assignment !== 'all' ? 1 : 0,
    value.deliveryMode !== undefined ? 1 : 0,
    value.reliefPackageDefinitionId ? 1 : 0,
    value.hasMultiplePackages !== undefined ? 1 : 0,
    value.teamId ? 1 : 0,
    value.distributionPointId ? 1 : 0,
    value.status !== undefined ? 1 : 0,
    value.isIsolated !== undefined ? 1 : 0,
    value.requiresBoat !== undefined ? 1 : 0,
    value.requiresLocalGuide !== undefined ? 1 : 0,
    value.minFloodSeverityLevel !== undefined ? 1 : 0,
    value.minIsolationSeverityLevel !== undefined ? 1 : 0,
    value.hasCoordinates !== undefined ? 1 : 0,
  ].reduce((sum, current) => sum + current, 0);

  const summaryBits = [
    value.assignment && value.assignment !== 'all'
      ? value.assignment === 'assigned'
        ? 'Đã gán đội'
        : 'Chưa gán đội'
      : null,
    value.deliveryMode !== undefined
      ? value.deliveryMode === 0
        ? 'Phát tận nơi'
        : 'Tại điểm phát'
      : null,
    value.isIsolated !== undefined ? (value.isIsolated ? 'Bị cô lập' : 'Không cô lập') : null,
    value.requiresBoat !== undefined
      ? value.requiresBoat
        ? 'Cần xuồng'
        : 'Không cần xuồng'
      : null,
    value.requiresLocalGuide !== undefined
      ? value.requiresLocalGuide
        ? 'Cần dẫn đường'
        : 'Không cần dẫn đường'
      : null,
    value.teamId
      ? (teams.find((item) => item.value === value.teamId)?.label ?? 'Đội đã chọn')
      : null,
    value.reliefPackageDefinitionId
      ? (packages.find((item) => item.value === value.reliefPackageDefinitionId)?.label ??
        'Gói đã chọn')
      : null,
    value.hasMultiplePackages !== undefined
      ? value.hasMultiplePackages
        ? 'Hộ có nhiều gói'
        : 'Hộ một gói'
      : null,
    value.distributionPointId
      ? (distributionPoints.find((item) => item.value === value.distributionPointId)?.label ??
        'Điểm đã chọn')
      : null,
  ].filter(Boolean) as string[];

  return (
    <Collapsible
      open={expanded}
      onOpenChange={onExpandedChange}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">filter_alt</span>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          {!expanded && (
            <p className="mt-2 text-sm text-muted-foreground">
              {activeFilterCount > 0
                ? `${activeFilterCount} bộ lọc đang áp dụng${summaryBits.length ? ` · ${summaryBits.slice(0, 3).join(' · ')}` : ''}`
                : 'Đang hiển thị tất cả hộ dân'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={onReset}
            disabled={activeFilterCount === 0}
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Xóa bộ lọc
          </Button>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {expanded ? 'expand_less' : 'tune'}
              </span>
              {expanded ? 'Thu gọn bộ lọc' : 'Bộ lọc nâng cao'}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className="pt-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2 xl:col-span-2">
            <p className="text-sm font-medium">Tìm kiếm hộ dân</p>
            <Input
              placeholder={searchPlaceholder}
              value={value.search}
              onChange={(e) => onChange({ ...value, search: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Hình thức nhận</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.deliveryMode ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  deliveryMode: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            >
              <option value="">Tất cả</option>
              <option value="0">Phát tận nơi</option>
              <option value="1"> Nhận tại điểm</option>
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Gói cứu trợ</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.reliefPackageDefinitionId ?? ''}
              onChange={(e) =>
                onChange({ ...value, reliefPackageDefinitionId: e.target.value || undefined })
              }
            >
              <option value="">Tất cả</option>
              {packages.map((pkg) => (
                <option key={pkg.value} value={pkg.value}>
                  {pkg.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Số lượng gói / hộ</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={
                value.hasMultiplePackages === undefined ? '' : String(value.hasMultiplePackages)
              }
              onChange={(e) =>
                onChange({
                  ...value,
                  hasMultiplePackages:
                    e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
            >
              <option value="">Tất cả</option>
              <option value="true">Nhiều gói</option>
              <option value="false">Một gói</option>
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Đội thực hiện</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.teamId ?? ''}
              onChange={(e) => onChange({ ...value, teamId: e.target.value || undefined })}
            >
              <option value="">Tất cả</option>
              {teams.map((team) => (
                <option key={team.value} value={team.value}>
                  {team.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Điểm phát</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.distributionPointId ?? ''}
              onChange={(e) =>
                onChange({ ...value, distributionPointId: e.target.value || undefined })
              }
            >
              <option value="">Tất cả</option>
              {distributionPoints.map((point) => (
                <option key={point.value} value={point.value}>
                  {point.label}
                </option>
              ))}
            </select>
          </div>

          {showStatusFilter && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Trạng thái</p>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={value.status ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    status: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                <option value="">Tất cả</option>
                <option value="0">Chưa bắt đầu</option>
                <option value="1">Đang thực hiện</option>
                <option value="2">Hoàn thành</option>
                <option value="3">Kẹt lại</option>
              </select>
            </div>
          )}

          {showIsolationFilter && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Độ cô lập</p>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={value.isIsolated === undefined ? '' : String(value.isIsolated)}
                onChange={(e) =>
                  onChange({
                    ...value,
                    isIsolated: e.target.value === '' ? undefined : e.target.value === 'true',
                  })
                }
              >
                <option value="">Tất cả</option>
                <option value="true">Bị cô lập</option>
                <option value="false">Không cô lập</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Phương tiện thủy</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.requiresBoat === undefined ? '' : String(value.requiresBoat)}
              onChange={(e) =>
                onChange({
                  ...value,
                  requiresBoat: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
            >
              <option value="">Tất cả</option>
              <option value="true">Cần xuồng/ghe</option>
              <option value="false">Không cần xuồng/ghe</option>
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Người dẫn đường</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.requiresLocalGuide === undefined ? '' : String(value.requiresLocalGuide)}
              onChange={(e) =>
                onChange({
                  ...value,
                  requiresLocalGuide: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
            >
              <option value="">Tất cả</option>
              <option value="true">Cần dẫn đường</option>
              <option value="false">Không cần dẫn đường</option>
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Mức ngập tối thiểu</p>
            <Input
              type="number"
              min={0}
              max={10}
              value={value.minFloodSeverityLevel ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  minFloodSeverityLevel: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Mức cô lập tối thiểu</p>
            <Input
              type="number"
              min={0}
              max={10}
              value={value.minIsolationSeverityLevel ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  minIsolationSeverityLevel: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Có tọa độ</p>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.hasCoordinates === undefined ? '' : String(value.hasCoordinates)}
              onChange={(e) =>
                onChange({
                  ...value,
                  hasCoordinates: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
            >
              <option value="">Tất cả</option>
              <option value="true">Có tọa độ</option>
              <option value="false">Thiếu tọa độ</option>
            </select>
          </div>

          {showAssignmentFilter && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Đội đã gán</p>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={value.assignment ?? 'all'}
                onChange={(e) =>
                  onChange({
                    ...value,
                    assignment: e.target.value as 'all' | 'assigned' | 'unassigned',
                  })
                }
              >
                <option value="all">Tất cả</option>
                <option value="assigned">Đã gán đội</option>
                <option value="unassigned">Chưa gán đội</option>
              </select>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
