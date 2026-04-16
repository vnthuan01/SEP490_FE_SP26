import { useEffect, useRef } from 'react';
import goongjs, { type Marker } from '@goongmaps/goong-js';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoongMap } from '@/hooks/useGoongMap';
import { formatNumberVN } from '@/lib/utils';

type DistributionPointMapItem = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  startsAt?: string;
  endsAt?: string;
  teamNames: string[];
  assignedHouseholdCount: number;
  deliveredCount: number;
};

const formatDateTimeVN = (value?: string) => {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa cập nhật';
  return parsed.toLocaleString('vi-VN');
};

const getPointTone = (point: DistributionPointMapItem) => {
  if (point.assignedHouseholdCount > 0 && point.deliveredCount >= point.assignedHouseholdCount) {
    return {
      markerBg: '#10b981',
      markerRing: '#d1fae5',
      badgeLabel: 'Hoàn tất',
    };
  }

  if (point.deliveredCount > 0) {
    return {
      markerBg: '#0284c7',
      markerRing: '#bae6fd',
      badgeLabel: 'Đang phát',
    };
  }

  return {
    markerBg: '#f59e0b',
    markerRing: '#fde68a',
    badgeLabel: point.assignedHouseholdCount > 0 ? 'Đã gán hộ' : 'Mới tạo',
  };
};

export function CoordinatorDistributionPointsMap({
  points,
  center,
}: {
  points: DistributionPointMapItem[];
  center: { lat: number; lng: number };
}) {
  const markersRef = useRef<Marker[]>([]);
  const { map, mapRef, isLoading, error } = useGoongMap({
    center,
    zoom: points.length > 0 ? 12 : 10,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: true,
  });

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new goongjs.LngLatBounds();
    bounds.extend([center.lng, center.lat]);

    points.forEach((point) => {
      const tone = getPointTone(point);
      const popup = new goongjs.Popup({ offset: [0, -16], maxWidth: '320px' }).setHTML(`
        <div style="font-family: Public Sans, sans-serif; min-width: 250px; padding: 6px 4px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px;">
            <div>
              <div style="font-weight:700; color:#111827; font-size:14px; margin-bottom:4px;">${point.name}</div>
              <div style="font-size:12px; color:#4b5563;">${point.address || 'Chưa cập nhật địa chỉ'}</div>
            </div>
            <div style="padding:4px 8px; border-radius:999px; font-size:11px; font-weight:600; background:${tone.markerRing}; color:${tone.markerBg}; white-space:nowrap;">${tone.badgeLabel}</div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:10px;">
            <div style="border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center;">
              <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">Đội</div>
              <div style="font-size:13px; font-weight:700; color:#111827;">${formatNumberVN(point.teamNames.length)}</div>
            </div>
            <div style="border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center;">
              <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">Đã gán</div>
              <div style="font-size:13px; font-weight:700; color:#111827;">${formatNumberVN(point.assignedHouseholdCount)}</div>
            </div>
            <div style="border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center;">
              <div style="font-size:11px; color:#6b7280; margin-bottom:4px;">Hoàn tất</div>
              <div style="font-size:13px; font-weight:700; color:#111827;">${formatNumberVN(point.deliveredCount)}</div>
            </div>
          </div>
          <div style="display:grid; gap:6px; font-size:12px; color:#111827;">
            <div><strong>Đội phụ trách:</strong> ${point.teamNames.length ? point.teamNames.join(', ') : 'Chưa gán đội cố định'}</div>
            <div><strong>Bắt đầu phát:</strong> ${formatDateTimeVN(point.startsAt)}</div>
            <div><strong>Kết thúc phát:</strong> ${formatDateTimeVN(point.endsAt)}</div>
          </div>
        </div>
      `);

      const markerElement = document.createElement('div');
      markerElement.innerHTML = `
        <div style="position:relative; width:42px; height:42px; border-radius:999px; background:${tone.markerBg}; border:3px solid white; box-shadow:0 10px 24px rgba(15,23,42,0.22); display:flex; align-items:center; justify-content:center;">
          <span class="material-symbols-outlined" style="font-size:20px; color:white;">inventory_2</span>
          <div style="position:absolute; right:-4px; top:-6px; min-width:20px; height:20px; border-radius:999px; background:${tone.markerRing}; color:${tone.markerBg}; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; padding:0 6px; border:2px solid white;">
            ${formatNumberVN(point.assignedHouseholdCount)}
          </div>
        </div>
      `;

      const marker = new goongjs.Marker({ element: markerElement })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([point.longitude, point.latitude]);
    });

    if (points.length > 0) {
      map.fitBounds(bounds, { padding: 64, maxZoom: points.length > 1 ? 13 : 15 });
    } else {
      map.setCenter([center.lng, center.lat]);
      map.setZoom(11);
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [map, points, center.lat, center.lng]);

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="space-y-1">
        <CardTitle>Bản đồ điểm phát</CardTitle>
        <p className="text-sm text-muted-foreground">
          Theo dõi vị trí, tiến độ và đội phụ trách tại từng điểm phát. Chạm vào marker để xem chi
          tiết.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" appearance="light">
            {formatNumberVN(points.length)} điểm phát
          </Badge>
          <Badge variant="warning" appearance="light">
            {formatNumberVN(points.reduce((sum, point) => sum + point.assignedHouseholdCount, 0))}{' '}
            hộ đã gán
          </Badge>
          <Badge variant="success" appearance="light">
            {formatNumberVN(points.reduce((sum, point) => sum + point.deliveredCount, 0))} hộ hoàn
            tất
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[360px] overflow-hidden rounded-xl border border-border bg-muted/20">
          <div ref={mapRef} className="h-full w-full" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/75 text-sm text-muted-foreground">
              Đang tải bản đồ điểm phát...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/85 px-4 text-center text-sm text-destructive">
              Không thể tải bản đồ điểm phát.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
