import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Vehicle } from '@/services/vehicleService';

export type VehicleDispatchModalVehicle = Vehicle;

interface VehicleDispatchModalProps {
  open: boolean;
  onClose: () => void;
  vehicleOptions: VehicleDispatchModalVehicle[];
  lockedVehicles: VehicleDispatchModalVehicle[];
  selectedVehicleIds: string[];
  onToggleVehicle: (vehicleId: string, checked: boolean) => void;
}

export function VehicleDispatchModal({
  open,
  onClose,
  vehicleOptions,
  lockedVehicles,
  selectedVehicleIds,
  onToggleVehicle,
}: VehicleDispatchModalProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    vehicleOptions.forEach((vehicle) => {
      const typeName = (vehicle.vehicleTypeName || 'Khác').trim() || 'Khác';
      types.add(typeName);
    });
    return ['all', ...Array.from(types)];
  }, [vehicleOptions]);

  const filteredVehicles = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return vehicleOptions.filter((vehicle) => {
      const typeName = (vehicle.vehicleTypeName || 'Khác').trim() || 'Khác';
      const matchesType = typeFilter === 'all' || typeName === typeFilter;
      const matchesSearch =
        !searchTerm ||
        `${typeName} - ${vehicle.licensePlate}`.toLowerCase().includes(searchTerm) ||
        vehicle.licensePlate.toLowerCase().includes(searchTerm) ||
        typeName.toLowerCase().includes(searchTerm);

      return matchesType && matchesSearch;
    });
  }, [search, typeFilter, vehicleOptions]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 z-0 bg-black/50 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Chọn phương tiện điều phối</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tìm kiếm, lọc theo loại xe và chọn nhiều phương tiện cùng lúc.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Đóng"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">
                  search
                </span>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo loại xe hoặc biển số"
                  className="h-10 pl-10"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Lọc theo loại xe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại xe</SelectItem>
                  {typeOptions
                    .filter((type) => type !== 'all')
                    .map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              {typeOptions.slice(0, 8).map((type) => {
                const active = typeFilter === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={`inline-flex h-9 items-center rounded-full border px-3 text-sm transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {type === 'all' ? 'Tất cả' : type}
                  </button>
                );
              })}
            </div>

            <div className="max-h-[420px] overflow-auto rounded-xl border border-border bg-muted/20 p-3">
              {filteredVehicles.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                  Không tìm thấy phương tiện phù hợp.
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {filteredVehicles.map((vehicle) => {
                    const isLocked = lockedVehicles.some(
                      (lockedVehicle) => lockedVehicle.vehicleId === vehicle.vehicleId,
                    );
                    const checked = isLocked || selectedVehicleIds.includes(vehicle.vehicleId);

                    return (
                      <label
                        key={vehicle.vehicleId}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={isLocked}
                          onCheckedChange={(value) =>
                            onToggleVehicle(vehicle.vehicleId, value === true)
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {vehicle.vehicleTypeName || 'Vehicle'}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {vehicle.licensePlate}
                              </p>
                            </div>
                            {isLocked ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Đã điều phối
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {vehicle.currentUsingTeamName || vehicle.teamName || 'Chưa gán đội'}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button variant="primary" onClick={onClose}>
              Áp dụng lựa chọn
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
