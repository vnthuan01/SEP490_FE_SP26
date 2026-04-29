import { useEffect, useRef } from 'react';
import goongjs, { type Marker } from '@goongmaps/goong-js';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { House, Ship } from 'lucide-react';
import { useGoongMap } from '@/hooks/useGoongMap';
import { formatNumberVN } from '@/lib/utils';
import type { CampaignAssignedVehicle } from '@/services/campaignService';
import type { IsolatedHouseholdPlanItemResponse } from '@/services/reliefDistributionService';
import { renderToStaticMarkup } from 'react-dom/server';

type IsolatedMarkerItem = IsolatedHouseholdPlanItemResponse & {
  vehicles: CampaignAssignedVehicle[];
};

const shipIconSvg = renderToStaticMarkup(<Ship size={18} strokeWidth={2.25} color="white" />);
const houseIconSvg = renderToStaticMarkup(<House size={18} strokeWidth={2.25} color="white" />);

const getMarkerTone = (item: IsolatedMarkerItem) => {
  if (item.requiresBoat) {
    return {
      markerBg: '#dc2626',
      markerRing: '#fecaca',
      label: 'Cần xuồng/ghe',
      markerIconSvg: shipIconSvg,
    };
  }
  return {
    markerBg: '#2563eb',
    markerRing: '#bfdbfe',
    label: 'Hộ cô lập',
    markerIconSvg: houseIconSvg,
  };
};

export function CoordinatorIsolatedHouseholdsMap({
  households,
  center,
}: {
  households: IsolatedMarkerItem[];
  center: { lat: number; lng: number };
}) {
  const markersRef = useRef<Marker[]>([]);
  const { map, mapRef, isLoading, error } = useGoongMap({
    center,
    zoom: households.length > 0 ? 11 : 10,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: true,
  });

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new goongjs.LngLatBounds();
    bounds.extend([center.lng, center.lat]);

    households
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .forEach((item) => {
        const tone = getMarkerTone(item);
        const vehicleSummary = item.vehicles.length
          ? item.vehicles
              .map(
                (vehicle) =>
                  `${vehicle.vehicleTypeName || 'Phương tiện'} - ${vehicle.licensePlate}`,
              )
              .join(', ')
          : 'Chưa điều phối phương tiện';

        const popup = new goongjs.Popup({ offset: [0, -16], maxWidth: '360px' }).setHTML(`
          <div style="font-family: Public Sans, sans-serif; min-width: 280px; padding: 6px 4px;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px;">
              <div>
                <div style="font-weight:700; color:#111827; font-size:14px; margin-bottom:4px;">${item.householdCode} · ${item.headOfHouseholdName}</div>
                <div style="font-size:12px; color:#4b5563;">${item.address || 'Chưa cập nhật địa chỉ'}</div>
                <div style="font-size:11px; color:#6b7280; margin-top:4px;">Đội: ${item.campaignTeamName || 'Chưa gán đội'}</div>
              </div>
              <div style="padding:4px 8px; border-radius:999px; font-size:11px; font-weight:600; background:${tone.markerRing}; color:${tone.markerBg}; white-space:nowrap;">${tone.label}</div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:10px;">
              <div style="border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center;">
                <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">Người</div>
                <div style="font-size:13px; font-weight:700; color:#111827;">${formatNumberVN(item.householdSize)}</div>
              </div>
              <div style="border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center;">
                <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">Mức ngập</div>
                <div style="font-size:13px; font-weight:700; color:#111827;">${formatNumberVN(item.floodSeverityLevel ?? 0)}</div>
              </div>
              <div style="border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center;">
                <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">Mức cô lập</div>
                <div style="font-size:13px; font-weight:700; color:#111827;">${formatNumberVN(item.isolationSeverityLevel ?? 0)}</div>
              </div>
            </div>
            <div style="display:grid; gap:6px; font-size:12px; color:#111827;">
              <div><strong>Nhiệm vụ:</strong> ${item.suggestedSupportMode || 'Đội cơ động xử lý ngoài hiện trường'}</div>
              <div><strong>Yêu cầu:</strong> ${item.requiresBoat ? 'Cần xuồng/ghe' : 'Không cần xuồng'}${item.requiresLocalGuide ? ' · Cần dẫn đường' : ''}</div>
              <div><strong>Phương tiện:</strong> ${vehicleSummary}</div>
              <div><strong>Áo phao gợi ý:</strong> ${formatNumberVN(item.estimatedLifeJacketCount)}</div>
              <div><strong>Nhân lực gợi ý:</strong> ${formatNumberVN(item.estimatedReliefPersonnel)}</div>
            </div>
          </div>
        `);

        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
          <div style="position:relative; width:42px; height:42px; border-radius:999px; background:${tone.markerBg}; border:3px solid white; box-shadow:0 10px 24px rgba(15,23,42,0.22); display:flex; align-items:center; justify-content:center;">
            <span style="display:inline-flex; align-items:center; justify-content:center;">${tone.markerIconSvg}</span>
            <div style="position:absolute; right:-4px; top:-6px; min-width:20px; height:20px; border-radius:999px; background:${tone.markerRing}; color:${tone.markerBg}; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:0 6px; border:2px solid white;">
              ${formatNumberVN(item.householdSize)}
            </div>
          </div>
        `;

        const marker = new goongjs.Marker({ element: markerElement })
          .setLngLat([item.longitude, item.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([item.longitude, item.latitude]);
      });

    if (households.length > 0) {
      map.fitBounds(bounds, { padding: 64, maxZoom: households.length > 1 ? 13 : 15 });
    } else {
      map.setCenter([center.lng, center.lat]);
      map.setZoom(10);
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [map, households, center.lat, center.lng]);

  return (
    <Card className="shadow-sm overflow-hidden p-2">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Bản đồ hộ cô lập trong toàn chiến dịch</CardTitle>
        <p className="text-sm text-muted-foreground">
          Theo dõi vị trí các hộ bị cô lập, đội phụ trách và phương tiện đang điều phối. Chọn mốc
          đánh dấu để xem nhiệm vụ và phương tiện đang điều phối.
        </p>
        <div className="flex flex-wrap gap-2 pt-2 mb-2">
          <Badge
            variant="outline"
            appearance="light"
            className="max-w-full whitespace-normal break-words"
          >
            {formatNumberVN(households.length)} hộ cô lập
          </Badge>
          <Badge
            variant="warning"
            appearance="light"
            className="max-w-full whitespace-normal break-words"
          >
            {formatNumberVN(households.filter((item) => item.requiresBoat).length)} cần xuồng/ghe
          </Badge>
          <Badge
            variant="info"
            appearance="light"
            className="max-w-full whitespace-normal break-words"
          >
            {formatNumberVN(households.filter((item) => item.requiresLocalGuide).length)} cần dẫn
            đường
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[420px] overflow-hidden rounded-xl border border-border bg-muted/20">
          <div ref={mapRef} className="h-full w-full" />
          <div className="absolute left-3 top-3 z-10 w-[250px] rounded-xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chú thích ký hiệu
            </p>
            <div className="mt-2 space-y-2 text-xs text-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-sm">
                  <Ship className="h-4 w-4" />
                </span>
                <span>Cần xuồng/ghe để tiếp cận</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <House className="h-4 w-4" />
                </span>
                <span>Hộ cô lập (không cần xuồng)</span>
              </div>
            </div>
          </div>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/75 text-sm text-muted-foreground">
              Đang tải bản đồ hộ cô lập...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/85 px-4 text-center text-sm text-destructive">
              Không thể tải bản đồ hộ cô lập.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
