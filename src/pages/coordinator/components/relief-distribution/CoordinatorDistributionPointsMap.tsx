import { useEffect, useRef } from 'react';
import goongjs, { type Marker } from '@goongmaps/goong-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoongMap } from '@/hooks/useGoongMap';

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
      const popup = new goongjs.Popup({ offset: [0, -16], maxWidth: '320px' }).setHTML(`
        <div style="font-family: Public Sans, sans-serif; min-width: 250px; padding: 6px 4px;">
          <div style="font-weight: 700; color: #b45309; font-size: 14px; margin-bottom: 6px;">${point.name}</div>
          <div style="font-size: 12px; color: #4b5563; margin-bottom: 8px;">${point.address || 'Chưa cập nhật địa chỉ'}</div>
          <div style="display:grid; gap:6px; font-size:12px; color:#111827;">
            <div><strong>Team phụ trách:</strong> ${point.teamNames.length ? point.teamNames.join(', ') : 'Chưa gán team cố định'}</div>
            <div><strong>Hộ đã gán:</strong> ${point.assignedHouseholdCount} hộ</div>
            <div><strong>Đã hoàn tất:</strong> ${point.deliveredCount} hộ</div>
            <div><strong>Bắt đầu phát:</strong> ${formatDateTimeVN(point.startsAt)}</div>
            <div><strong>Kết thúc phát:</strong> ${formatDateTimeVN(point.endsAt)}</div>
          </div>
        </div>
      `);

      const marker = new goongjs.Marker({ color: '#f59e0b' })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([point.longitude, point.latitude]);
    });

    if (points.length > 0) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
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
        <CardTitle>Bản đồ điểm phát hiện có</CardTitle>
        <p className="text-sm text-muted-foreground">
          Chạm vào từng điểm phát để xem địa chỉ, team phụ trách và số hộ dân đã được gán.
        </p>
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
