import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomCalendar from '@/components/ui/customCalendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrashIcon } from 'lucide-react';
import { StationAddressLookup } from '@/pages/manager/components/StationAddressLookup';
import { useGoongMap } from '@/hooks/useGoongMap';
import { getSupplyCategoryClass, getSupplyCategoryLabel } from '@/enums/beEnums';
import goongjs, { type Marker } from '@goongmaps/goong-js';
import type {
  CoordinatorDistributionPointForm,
  CoordinatorPackageForm,
  CoordinatorPackageItemForm,
} from './types';

type SupplyOption = {
  id: string;
  name: string;
  unit?: string;
  categoryName?: string;
  category?: string | number;
  availableQuantity?: number;
};

type ProvinceOption = { id: string; name?: string; fullName?: string; path?: string };
type FieldErrors = Record<string, string>;

const normalizeLocationText = (value?: string | null) => {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

const inferLocationIdFromAddress = (address: string, provinces: ProvinceOption[]) => {
  const normalizedAddress = normalizeLocationText(address);
  if (!normalizedAddress || !provinces.length) return '';

  const matchedProvince = provinces.find((province) => {
    const normalizedCandidates = [province.fullName, province.name, province.path]
      .filter(Boolean)
      .map((candidate) => normalizeLocationText(candidate));

    return normalizedCandidates.some(
      (candidate) => candidate && normalizedAddress.includes(candidate),
    );
  });

  return matchedProvince?.id || '';
};

const parseIsoToDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatDateVN = (value?: string | null) => {
  const parsed = parseIsoToDate(value);
  if (!parsed) return 'Chọn ngày';
  return parsed.toLocaleDateString('vi-VN');
};

export function CoordinatorReliefDistributionSetupSteps({
  distributionSectionId,
  packageSectionId,
  distributionPointForm,
  onChangeDistributionPointForm,
  onCreatePoint,
  createPointDisabled,
  packageForm,
  supplyItems,
  onChangePackageForm,
  onUpdatePackageItem,
  onAddPackageItem,
  onRemovePackageItem,
  onCreatePackage,
  createPackageDisabled,
  provinces,
  selectedLocationName,
  distributionPointErrors,
  packageErrors,
  onUseCurrentStation,
}: {
  distributionSectionId: string;
  packageSectionId: string;
  distributionPointForm: CoordinatorDistributionPointForm;
  onChangeDistributionPointForm: (
    updater: (prev: CoordinatorDistributionPointForm) => CoordinatorDistributionPointForm,
  ) => void;
  onCreatePoint: () => void;
  createPointDisabled: boolean;
  packageForm: CoordinatorPackageForm;
  supplyItems: SupplyOption[];
  onChangePackageForm: (updater: (prev: CoordinatorPackageForm) => CoordinatorPackageForm) => void;
  onUpdatePackageItem: (index: number, patch: Partial<CoordinatorPackageItemForm>) => void;
  onAddPackageItem: () => void;
  onRemovePackageItem: (index: number) => void;
  onCreatePackage: () => void;
  createPackageDisabled: boolean;
  provinces: ProvinceOption[];
  selectedLocationName?: string;
  distributionPointErrors: FieldErrors;
  packageErrors: FieldErrors;
  onUseCurrentStation: () => void;
}) {
  const [openStartCalendar, setOpenStartCalendar] = useState(false);
  const [openEndCalendar, setOpenEndCalendar] = useState(false);
  const previewMarkerRef = useRef<Marker | null>(null);
  const hasValidCoordinates =
    Number.isFinite(Number(distributionPointForm.latitude)) &&
    Number.isFinite(Number(distributionPointForm.longitude));
  const previewCenter = {
    lat: hasValidCoordinates ? Number(distributionPointForm.latitude) : 16.0544,
    lng: hasValidCoordinates ? Number(distributionPointForm.longitude) : 108.2022,
  };

  const {
    map: previewMap,
    mapRef: previewMapRef,
    isLoading: isLoadingPreviewMap,
    error: previewMapError,
  } = useGoongMap({
    center: previewCenter,
    zoom: hasValidCoordinates ? 15 : 11,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: true,
  });

  useEffect(() => {
    if (!previewMap || !hasValidCoordinates) return;

    previewMap.setCenter([
      Number(distributionPointForm.longitude),
      Number(distributionPointForm.latitude),
    ]);
    previewMap.setZoom(15);

    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
    }

    previewMarkerRef.current = new goongjs.Marker({ color: '#f97316' })
      .setLngLat([Number(distributionPointForm.longitude), Number(distributionPointForm.latitude)])
      .setPopup(
        new goongjs.Popup({ offset: [0, -24], closeButton: false }).setHTML(
          `<div style="font-family:sans-serif;padding:2px 0;min-width:180px"><p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#c2410c">Điểm phát dự kiến</p>${distributionPointForm.name ? `<p style="font-size:12px;color:#374151;margin:0 0 2px">${distributionPointForm.name}</p>` : ''}${distributionPointForm.address ? `<p style="font-size:11px;color:#6b7280;margin:4px 0 0">${distributionPointForm.address}</p>` : ''}</div>`,
        ),
      )
      .addTo(previewMap);

    return () => {
      previewMarkerRef.current?.remove();
      previewMarkerRef.current = null;
    };
  }, [
    previewMap,
    hasValidCoordinates,
    distributionPointForm.latitude,
    distributionPointForm.longitude,
    distributionPointForm.address,
    distributionPointForm.name,
  ]);

  return (
    <div className="grid min-w-0 gap-6 grid-cols-1">
      <Card id={distributionSectionId} className="shadow-sm scroll-mt-24">
        <CardHeader className="space-y-1">
          <CardTitle>1</CardTitle>
          <p className="text-sm text-muted-foreground">
            Điều phối viên tạo điểm phát cho chiến dịch tại trạm hiện tại.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Tên điểm phát</p>
                <Input
                  placeholder="Ví dụ: Điểm phát phường Hòa Cường"
                  value={distributionPointForm.name}
                  onChange={(e) =>
                    onChangeDistributionPointForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                {distributionPointErrors.name && (
                  <p className="text-sm text-destructive">{distributionPointErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Thời gian vận hành</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Bắt đầu phát
                    </p>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2 font-normal"
                        onClick={() => {
                          setOpenStartCalendar((prev) => !prev);
                          setOpenEndCalendar(false);
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          calendar_month
                        </span>
                        {formatDateVN(distributionPointForm.startsAt)}
                      </Button>
                      {openStartCalendar && (
                        <div className="absolute left-0 z-50 mt-2 rounded-xl border border-border bg-background p-3 shadow-lg">
                          <CustomCalendar
                            value={parseIsoToDate(distributionPointForm.startsAt)}
                            onChange={(date) => {
                              if (!date) return;
                              const current =
                                parseIsoToDate(distributionPointForm.startsAt) || new Date();
                              date.setHours(
                                current.getHours() || 8,
                                current.getMinutes() || 0,
                                0,
                                0,
                              );
                              onChangeDistributionPointForm((prev) => ({
                                ...prev,
                                startsAt: date.toISOString(),
                              }));
                              setOpenStartCalendar(false);
                            }}
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenStartCalendar(false)}
                            >
                              Thu gọn
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      type="time"
                      value={
                        distributionPointForm.startsAt
                          ? new Date(distributionPointForm.startsAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })
                          : '08:00'
                      }
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const base = parseIsoToDate(distributionPointForm.startsAt) || new Date();
                        base.setHours(hours || 0, minutes || 0, 0, 0);
                        onChangeDistributionPointForm((prev) => ({
                          ...prev,
                          startsAt: base.toISOString(),
                        }));
                      }}
                    />
                    {distributionPointErrors.startsAt && (
                      <p className="text-sm text-destructive">{distributionPointErrors.startsAt}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Kết thúc phát
                    </p>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2 font-normal"
                        onClick={() => {
                          setOpenEndCalendar((prev) => !prev);
                          setOpenStartCalendar(false);
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">event</span>
                        {distributionPointForm.endsAt
                          ? formatDateVN(distributionPointForm.endsAt)
                          : 'Chọn ngày'}
                      </Button>
                      {openEndCalendar && (
                        <div className="absolute left-0 z-50 mt-2 rounded-xl border border-border bg-background p-3 shadow-lg">
                          <CustomCalendar
                            value={parseIsoToDate(distributionPointForm.endsAt)}
                            onChange={(date) => {
                              if (!date) {
                                onChangeDistributionPointForm((prev) => ({ ...prev, endsAt: '' }));
                                setOpenEndCalendar(false);
                                return;
                              }
                              const current =
                                parseIsoToDate(distributionPointForm.endsAt) || new Date();
                              date.setHours(
                                current.getHours() || 17,
                                current.getMinutes() || 0,
                                0,
                                0,
                              );
                              onChangeDistributionPointForm((prev) => ({
                                ...prev,
                                endsAt: date.toISOString(),
                              }));
                              setOpenEndCalendar(false);
                            }}
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenEndCalendar(false)}
                            >
                              Thu gọn
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      type="time"
                      value={
                        distributionPointForm.endsAt
                          ? new Date(distributionPointForm.endsAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })
                          : '17:00'
                      }
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const base = parseIsoToDate(distributionPointForm.endsAt) || new Date();
                        base.setHours(hours || 0, minutes || 0, 0, 0);
                        onChangeDistributionPointForm((prev) => ({
                          ...prev,
                          endsAt: base.toISOString(),
                        }));
                      }}
                    />
                    {distributionPointErrors.endsAt && (
                      <p className="text-sm text-destructive">{distributionPointErrors.endsAt}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Thông tin toạ độ đã chọn</p>
                    <p className="text-xs text-muted-foreground">
                      Dùng bản đồ để lấy đúng lat/lng và địa chỉ phát hàng cụ thể.
                    </p>
                  </div>
                  <Badge variant="outline" appearance="light">
                    Điểm phát
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant={distributionPointForm.locationId ? 'success' : 'warning'}
                    appearance="light"
                  >
                    {distributionPointForm.locationId
                      ? 'Đã tự nhận diện khu vực điểm phát'
                      : 'Chưa nhận diện được tỉnh / thành của điểm phát'}
                  </Badge>
                  <Button type="button" variant="outline" size="sm" onClick={onUseCurrentStation}>
                    Dùng vị trí trạm hiện tại
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Vĩ độ</p>
                    <p className="mt-1 font-medium text-foreground">
                      {Number(distributionPointForm.latitude || 0).toFixed(6)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Kinh độ</p>
                    <p className="mt-1 font-medium text-foreground">
                      {Number(distributionPointForm.longitude || 0).toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Khu vực đã tự nhận diện
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedLocationName || 'Chưa tự nhận diện được khu vực phù hợp'}
                  </p>
                  {selectedLocationName && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Điểm phát này được hiểu là thuộc khu vực {selectedLocationName}.
                    </p>
                  )}
                  {distributionPointErrors.locationId && (
                    <p className="mt-2 text-sm text-destructive">
                      {distributionPointErrors.locationId}
                    </p>
                  )}
                  {(distributionPointErrors.latitude || distributionPointErrors.longitude) && (
                    <p className="mt-2 text-sm text-destructive">
                      {distributionPointErrors.latitude || distributionPointErrors.longitude}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <StationAddressLookup
                  label="Địa điểm trạm phát"
                  required
                  address={distributionPointForm.address}
                  latitude={Number(distributionPointForm.latitude || 0)}
                  longitude={Number(distributionPointForm.longitude || 0)}
                  onPickAddress={({ address, latitude, longitude }) => {
                    const inferredLocationId = inferLocationIdFromAddress(address, provinces);

                    onChangeDistributionPointForm((prev) => ({
                      ...prev,
                      address,
                      latitude,
                      longitude,
                      locationId: inferredLocationId || prev.locationId,
                    }));
                  }}
                />
              </div>

              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">Địa chỉ chi tiết đang dùng</p>
                <p className="mt-2 text-muted-foreground">
                  {distributionPointForm.address || 'Chưa chọn địa chỉ trên bản đồ.'}
                </p>
                {distributionPointErrors.address && (
                  <p className="mt-2 text-sm text-destructive">{distributionPointErrors.address}</p>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Preview map mini</p>
                  <p className="text-xs text-muted-foreground">
                    Xem nhanh vị trí điểm phát sau khi chọn trên bản đồ.
                  </p>
                </div>

                <div className="relative h-[260px] bg-muted/20">
                  <div ref={previewMapRef} className="h-full w-full" />

                  {isLoadingPreviewMap && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
                      Đang tải preview map...
                    </div>
                  )}

                  {previewMapError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 px-4 text-center text-sm text-destructive">
                      Không thể tải preview map Goong.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button onClick={onCreatePoint} disabled={createPointDisabled}>
            Tạo điểm phát
          </Button>
        </CardContent>
      </Card>

      <Card id={packageSectionId} className="shadow-sm scroll-mt-24">
        <CardHeader className="space-y-1">
          <CardTitle>2</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tạo gói cứu trợ để dùng khi phân công đội thực hiện cho các hộ dân.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Tên gói cứu trợ</p>
            <Input
              placeholder="Ví dụ: Gói lương thực cơ bản"
              value={packageForm.name}
              onChange={(e) => onChangePackageForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            {packageErrors.name && <p className="text-sm text-destructive">{packageErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Mô tả gói cứu trợ</p>
            <Textarea
              placeholder="Mô tả ngắn các thành phần và mục đích sử dụng"
              value={packageForm.description || ''}
              onChange={(e) =>
                onChangePackageForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            {packageErrors.description && (
              <p className="text-sm text-destructive">{packageErrors.description}</p>
            )}
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm">
            <p className="font-medium text-primary">
              Gói cứu trợ được tạo trực tiếp từ vật phẩm đang có trong kho
            </p>
            <p className="mt-1 text-muted-foreground">
              Bạn chỉ cần chọn đúng vật phẩm kho, số lượng và đơn vị. Hệ thống sẽ tự quy đổi gói dựa
              trên vật phẩm thành phần đã chọn.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Danh sách thành phần</p>
                <p className="text-xs text-muted-foreground">
                  Hiển thị tối đa 3 dòng, có thể cuộn khi thêm nhiều thành phần.
                </p>
              </div>
              <Badge variant="outline" appearance="light">
                {packageForm.items.length} thành phần
              </Badge>
            </div>

            <div className="max-h-[252px] space-y-3 overflow-y-auto pr-1">
              {packageForm.items.map((item, index) => (
                <div
                  key={`${index}-${item.supplyItemId}`}
                  className={`grid gap-3 items-start rounded-xl border p-3 md:grid-cols-[minmax(0,1fr)_88px_110px_auto] ${
                    packageErrors[`items.${index}.supplyItemId`]
                      ? 'border-destructive/60 bg-destructive/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Vật phẩm thành phần #{index + 1}</p>
                    <Select
                      value={item.supplyItemId}
                      onValueChange={(value) => {
                        const matchedSupply = supplyItems.find((supply) => supply.id === value);
                        onUpdatePackageItem(index, {
                          supplyItemId: value,
                          unit: matchedSupply?.unit || item.unit,
                        });
                      }}
                    >
                      <SelectTrigger className="min-w-0">
                        <SelectValue placeholder="Chọn vật phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplyItems.map((supplyItem) => {
                          const isSelectedElsewhere = packageForm.items.some(
                            (selectedItem, selectedIndex) =>
                              selectedIndex !== index &&
                              selectedItem.supplyItemId === supplyItem.id,
                          );

                          return (
                            <SelectItem
                              key={supplyItem.id}
                              value={supplyItem.id}
                              disabled={isSelectedElsewhere}
                            >
                              {supplyItem.name}
                              {typeof supplyItem.availableQuantity === 'number'
                                ? ` • tồn ${supplyItem.availableQuantity} ${supplyItem.unit || ''}`
                                : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {packageErrors[`items.${index}.supplyItemId`] && (
                      <p className="text-sm text-destructive">
                        {packageErrors[`items.${index}.supplyItemId`]}
                      </p>
                    )}
                    {!!item.supplyItemId &&
                      (() => {
                        const matchedSupply = supplyItems.find(
                          (supply) => supply.id === item.supplyItemId,
                        );
                        if (!matchedSupply) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge
                              variant="outline"
                              appearance="light"
                              className={`gap-1 border ${getSupplyCategoryClass(matchedSupply.category || matchedSupply.categoryName)}`}
                            >
                              {getSupplyCategoryLabel(
                                matchedSupply.category || matchedSupply.categoryName,
                              )}
                            </Badge>
                            <span>
                              Tồn {matchedSupply.availableQuantity ?? 0} {matchedSupply.unit || ''}
                            </span>
                          </div>
                        );
                      })()}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Số lượng</p>
                    <Input
                      type="number"
                      placeholder="SL"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdatePackageItem(index, { quantity: Number(e.target.value) })
                      }
                    />
                    {packageErrors[`items.${index}.quantity`] && (
                      <p className="text-sm text-destructive">
                        {packageErrors[`items.${index}.quantity`]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Đơn vị</p>
                    <Input
                      placeholder="kg, thùng..."
                      value={item.unit}
                      disabled={!!item.supplyItemId}
                      onChange={(e) => onUpdatePackageItem(index, { unit: e.target.value })}
                    />
                    {packageErrors[`items.${index}.unit`] && (
                      <p className="text-sm text-destructive">
                        {packageErrors[`items.${index}.unit`]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Xóa</p>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      disabled={packageForm.items.length === 1}
                      onClick={() => onRemovePackageItem(index)}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={onAddPackageItem}>
              Thêm thành phần
            </Button>
            {packageErrors.items && (
              <p className="text-sm text-destructive">{packageErrors.items}</p>
            )}
          </div>

          <Button onClick={onCreatePackage} disabled={createPackageDisabled}>
            Tạo gói cứu trợ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
