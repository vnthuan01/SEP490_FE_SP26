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
import { formatNumberInputVN, formatNumberVN, parseFormattedNumber } from '@/lib/utils';
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

const clampDateTimeToCampaign = (
  value: Date,
  campaignStartDate?: string,
  campaignEndDate?: string,
) => {
  const next = new Date(value);
  const start = parseIsoToDate(campaignStartDate);
  const end = parseIsoToDate(campaignEndDate);

  if (start && next < start) return new Date(start);
  if (end && next > end) return new Date(end);
  return next;
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
  distributionPointEditing,
  onCancelDistributionPointEdit,
  onEditDistributionPoint,
  onDeleteDistributionPoint,
  packageEditing,
  onCancelPackageEdit,
  onEditPackage,
  onDeletePackage,
  campaignStartDate,
  campaignEndDate,
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
  distributionPointEditing: boolean;
  onCancelDistributionPointEdit: () => void;
  onEditDistributionPoint: () => void;
  onDeleteDistributionPoint: () => void;
  packageEditing: boolean;
  onCancelPackageEdit: () => void;
  onEditPackage: () => void;
  onDeletePackage: () => void;
  campaignStartDate?: string;
  campaignEndDate?: string;
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
          <CardTitle>Bước 1. Tạo điểm phát</CardTitle>
          <p className="text-sm text-muted-foreground">
            Thiết lập địa điểm và thời gian phát hàng cho chiến dịch.
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
                <p className="text-sm font-medium">Thời gian phát hàng</p>
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Ngày bắt đầu
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
                            disabledDays={{ before: new Date() }}
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
                              const clamped = clampDateTimeToCampaign(
                                date,
                                campaignStartDate,
                                campaignEndDate,
                              );
                              onChangeDistributionPointForm((prev) => ({
                                ...prev,
                                startsAt: clamped.toISOString(),
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
                        const clamped = clampDateTimeToCampaign(
                          base,
                          campaignStartDate,
                          campaignEndDate,
                        );
                        onChangeDistributionPointForm((prev) => ({
                          ...prev,
                          startsAt: clamped.toISOString(),
                        }));
                      }}
                    />
                    {distributionPointErrors.startsAt && (
                      <p className="text-sm text-destructive">{distributionPointErrors.startsAt}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Ngày kết thúc
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
                            disabledDays={{ before: new Date() }}
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
                              const clamped = clampDateTimeToCampaign(
                                date,
                                campaignStartDate,
                                campaignEndDate,
                              );
                              onChangeDistributionPointForm((prev) => ({
                                ...prev,
                                endsAt: clamped.toISOString(),
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
                        const clamped = clampDateTimeToCampaign(
                          base,
                          campaignStartDate,
                          campaignEndDate,
                        );
                        onChangeDistributionPointForm((prev) => ({
                          ...prev,
                          endsAt: clamped.toISOString(),
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
                    <p className="text-sm font-medium">Vị trí điểm phát</p>
                    <p className="text-xs text-muted-foreground">
                      Dùng bản đồ để lấy đúng lat/lng và địa chỉ phát hàng cụ thể.
                    </p>
                  </div>
                  <Badge variant="info" appearance="light">
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
                  <Button type="button" variant="primary" size="sm" onClick={onUseCurrentStation}>
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    Dùng vị trí trạm
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
                    Khu vực nhận diện được
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
                  label="Địa chỉ điểm phát"
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
                <p className="font-medium text-foreground">Địa chỉ đã chọn</p>
                <p className="mt-2 text-muted-foreground">
                  {distributionPointForm.address || 'Chưa chọn địa chỉ trên bản đồ.'}
                </p>
                {distributionPointErrors.address && (
                  <p className="mt-2 text-sm text-destructive">{distributionPointErrors.address}</p>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Xem trước trên bản đồ</p>
                  <p className="text-xs text-muted-foreground">
                    Dùng bản đồ để lấy đúng vĩ độ/kinh độ và địa chỉ phát hàng cụ thể.
                  </p>
                </div>

                <div className="relative h-[260px] bg-muted/20">
                  <div ref={previewMapRef} className="h-full w-full" />

                  {isLoadingPreviewMap && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
                      Đang tải bản đồ xem trước...
                    </div>
                  )}

                  {previewMapError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 px-4 text-center text-sm text-destructive">
                      Không thể tải bản đồ xem trước Goong.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="flex flex-wrap justify-end gap-2">
              {distributionPointEditing && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancelDistributionPointEdit}
                    className="gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Huỷ sửa
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onDeleteDistributionPoint}
                    className="gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Xoá điểm phát
                  </Button>
                  <Button onClick={onEditDistributionPoint} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Cập nhật điểm phát
                  </Button>
                </>
              )}
              {!distributionPointEditing && (
                <Button onClick={onCreatePoint} disabled={createPointDisabled} className="gap-2">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Lưu điểm phát
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id={packageSectionId} className="shadow-sm scroll-mt-24">
        <CardHeader className="space-y-1">
          <CardTitle>Bước 2. Tạo gói hỗ trợ</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tạo định nghĩa gói hỗ trợ từ các vật phẩm hiện có trong kho để dùng khi gán cho hộ dân.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Tên gói hỗ trợ</p>
            <Input
              placeholder="Ví dụ: Gói lương thực cơ bản"
              value={packageForm.name}
              onChange={(e) => onChangePackageForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            {packageErrors.name && <p className="text-sm text-destructive">{packageErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Mô tả gói hỗ trợ</p>
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
          <div className="space-y-2">
            <p className="text-sm font-medium">Hỗ trợ tiền mặt / hộ</p>
            <Input
              placeholder="Ví dụ: 200000"
              value={packageForm.cashSupportAmount}
              onChange={(e) =>
                onChangePackageForm((prev) => ({
                  ...prev,
                  cashSupportAmount: formatNumberInputVN(e.target.value),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Nhập 0 nếu gói không có hỗ trợ tiền mặt.
            </p>
            {packageErrors.cashSupportAmount && (
              <p className="text-sm text-destructive">{packageErrors.cashSupportAmount}</p>
            )}
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm">
            <p className="font-medium text-primary">Gói hỗ trợ được tạo từ tồn kho chiến dịch</p>
            <p className="mt-1 text-muted-foreground">
              Chọn vật phẩm, số lượng và đơn vị để cấu thành gói hỗ trợ. Hệ thống sẽ tự xác định vật
              phẩm đầu ra theo xử lý của hệ thống.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Vật phẩm trong gói</p>
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
                    <p className="text-sm font-medium">Vật phẩm #{index + 1}</p>
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
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
                              <span className="material-symbols-outlined text-[14px] text-amber-600 dark:text-amber-300">
                                inventory
                              </span>
                              <span>
                                Tồn kho: {formatNumberVN(matchedSupply.availableQuantity ?? 0)}{' '}
                                {matchedSupply.unit || ''}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Số lượng</p>
                    <Input
                      placeholder="SL"
                      value={formatNumberInputVN(item.quantity)}
                      onChange={(e) =>
                        onUpdatePackageItem(index, {
                          quantity: parseFormattedNumber(e.target.value),
                        })
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

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={onAddPackageItem} className="gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Thêm vật phẩm
              </Button>
            </div>
            {packageErrors.items && (
              <p className="text-sm text-destructive">{packageErrors.items}</p>
            )}
          </div>

          <div className="flex justify-end">
            <div className="flex flex-wrap justify-end gap-2">
              {packageEditing && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancelPackageEdit}
                    className="gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Huỷ sửa
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onDeletePackage}
                    className="gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Xoá gói
                  </Button>
                  <Button onClick={onEditPackage} className="gap-2">
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    Cập nhật gói hỗ trợ
                  </Button>
                </>
              )}
              {!packageEditing && (
                <Button
                  onClick={onCreatePackage}
                  disabled={createPackageDisabled}
                  className="gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  Lưu gói hỗ trợ
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
