import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import goongjs from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { useGoongMap } from '@/hooks/useGoongMap';
import { campaignService, type Campaign, type CampaignSummary } from '@/services/campaignService';
import type { ReliefStationResponse } from '@/services/reliefStationService';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { cn } from '@/lib/utils';
import {
  CampaignStatus,
  CampaignStatusIcon,
  ReliefStationLevel,
  ReliefStationLevelLabel,
  ReliefStationStatus,
  ReliefStationStatusLabel,
  getCampaignStatusClass,
  getCampaignStatusIcon,
  getCampaignStatusLabel,
  getCampaignTypeLabel,
  parseEnumValue,
} from '@/enums/beEnums';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ManagedCampaign = Campaign & {
  overallProgressPercent?: number;
  assignedAt?: string;
};

type MapFocusTarget = 'station' | 'campaign';

interface StationCampaignMapProps {
  station: ReliefStationResponse;
  campaigns: ManagedCampaign[];
  selectedCampaignId: string | null;
  onSelectCampaign: Function;
  onSelectStation?: () => void;
  heightClass?: string;
  showOpenLargeMapButton?: boolean;
  onOpenLargeMap?: () => void;
}

const ACTIVE_CAMPAIGN_STATUSES: number[] = [
  CampaignStatus.Active,
  CampaignStatus.ReadyToExecute,
  CampaignStatus.InProgress,
  CampaignStatus.Closing,
];

const getStatusText = (status?: number) =>
  ReliefStationStatusLabel[parseEnumValue(status) as ReliefStationStatus] ?? 'Không xác định';

const getStatusTextClass = (status?: number) => {
  const parsedStatus = parseEnumValue(status) as ReliefStationStatus;

  switch (parsedStatus) {
    case ReliefStationStatus.Active:
      return 'text-emerald-600 dark:text-emerald-400';
    case ReliefStationStatus.Draft:
      return 'text-amber-600 dark:text-amber-400';
    case ReliefStationStatus.Inactive:
      return 'text-slate-600 dark:text-slate-300';
    case ReliefStationStatus.Closed:
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-foreground';
  }
};

const getLevelText = (level?: number) =>
  ReliefStationLevelLabel[parseEnumValue(level) as ReliefStationLevel] ?? 'Không xác định';

const hasValidCoordinates = (latitude?: number | null, longitude?: number | null) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return !(latitude === 0 && longitude === 0);
};

const formatDateTimeVN = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa cập nhật';
  return parsed.toLocaleString('vi-VN');
};

const formatDateVN = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa cập nhật';
  return parsed.toLocaleDateString('vi-VN');
};

const formatCoordinatesVN = (latitude?: number | null, longitude?: number | null) => {
  if (!hasValidCoordinates(latitude, longitude)) return 'Chưa có tọa độ hợp lệ';
  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
};

const buildCirclePolygon = (lat: number, lng: number, radiusKm: number, steps = 72) => {
  const earthRadiusKm = 6371;
  const angularDistance = radiusKm / earthRadiusKm;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const ring: Array<[number, number]> = [];

  for (let step = 0; step <= steps; step += 1) {
    const bearing = (2 * Math.PI * step) / steps;

    const pointLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );

    const pointLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLat),
      );

    ring.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return ring;
};

function StationCampaignMap({
  station,
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onSelectStation,
  heightClass = 'h-[540px]',
  showOpenLargeMapButton = false,
  onOpenLargeMap,
}: StationCampaignMapProps) {
  const stationHasCoordinates = hasValidCoordinates(station.latitude, station.longitude);
  const firstCampaignWithCoordinates = campaigns.find((campaign) =>
    hasValidCoordinates(campaign.latitude, campaign.longitude),
  );

  const mapCenter = stationHasCoordinates
    ? { lat: Number(station.latitude), lng: Number(station.longitude) }
    : firstCampaignWithCoordinates
      ? {
          lat: Number(firstCampaignWithCoordinates.latitude),
          lng: Number(firstCampaignWithCoordinates.longitude),
        }
      : { lat: 16.0544, lng: 108.2022 };

  const { map, mapRef, isLoading, error } = useGoongMap({
    center: mapCenter,
    zoom: stationHasCoordinates || firstCampaignWithCoordinates ? 11 : 6,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: true,
  });

  const stationMarkerRef = useRef<any>(null);
  const campaignMarkersRef = useRef<any[]>([]);
  const stationPopupRef = useRef<any>(null);
  const campaignPopupRefs = useRef<any[]>([]);

  useEffect(() => {
    if (!map) return;

    if (stationMarkerRef.current) {
      stationMarkerRef.current.remove();
      stationMarkerRef.current = null;
    }

    if (stationPopupRef.current) {
      stationPopupRef.current.remove();
      stationPopupRef.current = null;
    }

    campaignMarkersRef.current.forEach((marker) => marker.remove());
    campaignMarkersRef.current = [];
    campaignPopupRefs.current.forEach((popup) => popup.remove());
    campaignPopupRefs.current = [];

    if (stationHasCoordinates) {
      const stationMarkerElement = document.createElement('button');
      stationMarkerElement.type = 'button';
      stationMarkerElement.className =
        'flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer';
      stationMarkerElement.innerHTML = `
        <span style="width:12px;height:12px;background:#7c3aed;border-radius:9999px;box-shadow:0 0 0 5px rgba(124,58,237,.2);"></span>
        <span style="font-size:11px;font-weight:700;background:#6d28d9;color:#fff;padding:3px 8px;border-radius:9999px;white-space:nowrap;">Trạm phụ trách</span>
      `;

      const stationPopup = new goongjs.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
      }).setHTML(`
        <div style="min-width:220px;max-width:280px;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="width:10px;height:10px;background:#7c3aed;border-radius:9999px;"></span>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6d28d9;">Trạm phụ trách</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.4;">${station.name}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">${getStatusText(station.status)} • ${getLevelText(station.level)}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">${station.locationName || 'Chưa rõ khu vực'}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Bán kính hỗ trợ: ${Number(station.coverageRadiusKm || 0) > 0 ? `${Number(station.coverageRadiusKm)} km` : 'Chưa thiết lập'}</div>
          <div style="font-size:12px;color:#2563eb;margin-top:8px;font-weight:600;">Bấm để xem trên bản đồ lớn</div>
        </div>
      `);
      stationPopupRef.current = stationPopup;

      stationMarkerElement.addEventListener('mouseenter', () => stationPopup.addTo(map));
      stationMarkerElement.addEventListener('mouseleave', () => stationPopup.remove());
      stationMarkerElement.addEventListener('click', () => {
        stationPopup.addTo(map);
        onSelectStation?.();
      });

      stationMarkerRef.current = new goongjs.Marker({ element: stationMarkerElement })
        .setLngLat([Number(station.longitude), Number(station.latitude)])
        .setPopup(stationPopup)
        .addTo(map);
    }

    campaigns.forEach((campaign) => {
      if (!hasValidCoordinates(campaign.latitude, campaign.longitude)) return;

      const isSelected = campaign.campaignId === selectedCampaignId;
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className =
        'flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer';
      markerElement.innerHTML = `
        <span style="width:12px;height:12px;background:${isSelected ? '#f59e0b' : '#10b981'};border-radius:9999px;box-shadow:0 0 0 5px ${isSelected ? 'rgba(245,158,11,.18)' : 'rgba(16,185,129,.18)'};"></span>
        ${isSelected ? `<span style="font-size:11px;font-weight:700;background:#b45309;color:#fff;padding:3px 8px;border-radius:9999px;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${campaign.name}</span>` : ''}
      `;

      const campaignPopup = new goongjs.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
      }).setHTML(`
        <div style="min-width:220px;max-width:290px;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="width:10px;height:10px;background:${isSelected ? '#f59e0b' : '#10b981'};border-radius:9999px;"></span>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${isSelected ? '#b45309' : '#047857'};">Chiến dịch</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.4;">${campaign.name}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">${getCampaignStatusLabel(campaign.status)} • ${getCampaignTypeLabel(campaign.type)}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">${formatDateVN(campaign.startDate)} - ${formatDateVN(campaign.endDate)}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">${Number(campaign.areaRadiusKm || 0) > 0 ? `Bán kính hoạt động ${Number(campaign.areaRadiusKm)} km` : 'Chưa thiết lập bán kính hoạt động'}</div>
          <div style="font-size:12px;color:#2563eb;margin-top:8px;font-weight:600;">Bấm để xem trên bản đồ lớn</div>
        </div>
      `);
      campaignPopupRefs.current.push(campaignPopup);

      markerElement.addEventListener('mouseenter', () => campaignPopup.addTo(map));
      markerElement.addEventListener('mouseleave', () => campaignPopup.remove());
      markerElement.addEventListener('click', () => {
        campaignPopup.addTo(map);
        onSelectCampaign(campaign.campaignId);
      });

      const marker = new goongjs.Marker({ element: markerElement })
        .setLngLat([Number(campaign.longitude), Number(campaign.latitude)])
        .setPopup(campaignPopup)
        .addTo(map);

      campaignMarkersRef.current.push(marker);
    });

    return () => {
      if (stationMarkerRef.current) {
        stationMarkerRef.current.remove();
        stationMarkerRef.current = null;
      }

      if (stationPopupRef.current) {
        stationPopupRef.current.remove();
        stationPopupRef.current = null;
      }

      campaignMarkersRef.current.forEach((marker) => marker.remove());
      campaignMarkersRef.current = [];
      campaignPopupRefs.current.forEach((popup) => popup.remove());
      campaignPopupRefs.current = [];
    };
  }, [
    campaigns,
    map,
    onSelectCampaign,
    onSelectStation,
    selectedCampaignId,
    station.coverageRadiusKm,
    station.latitude,
    station.level,
    station.locationName,
    station.name,
    station.longitude,
    station.status,
    stationHasCoordinates,
  ]);

  useEffect(() => {
    if (!map) return;

    const stationSourceId = 'coordinator-station-coverage-source';
    const stationFillId = 'coordinator-station-coverage-fill';
    const stationOutlineId = 'coordinator-station-coverage-outline';
    const campaignIds = campaigns.map((campaign) => campaign.campaignId);

    const clearLayers = () => {
      const mapImpl = map as any;
      if (!mapImpl || typeof mapImpl.getStyle !== 'function') return;

      let hasStyle = false;
      try {
        hasStyle = !!mapImpl.getStyle();
      } catch {
        hasStyle = false;
      }

      if (!hasStyle) return;

      [stationFillId, stationOutlineId].forEach((layerId) => {
        if (mapImpl.getLayer?.(layerId)) {
          try {
            mapImpl.removeLayer(layerId);
          } catch {
            // Ignore cleanup errors
          }
        }
      });

      if (mapImpl.getSource?.(stationSourceId)) {
        try {
          mapImpl.removeSource(stationSourceId);
        } catch {
          // Ignore cleanup errors
        }
      }

      campaignIds.forEach((campaignId) => {
        const sourceId = `campaign-area-source-${campaignId}`;
        const fillId = `campaign-area-fill-${campaignId}`;
        const outlineId = `campaign-area-outline-${campaignId}`;

        [fillId, outlineId].forEach((layerId) => {
          if (mapImpl.getLayer?.(layerId)) {
            try {
              mapImpl.removeLayer(layerId);
            } catch {
              // Ignore cleanup errors
            }
          }
        });

        if (mapImpl.getSource?.(sourceId)) {
          try {
            mapImpl.removeSource(sourceId);
          } catch {
            // Ignore cleanup errors
          }
        }
      });
    };

    const drawAreas = () => {
      clearLayers();

      if (stationHasCoordinates && Number(station.coverageRadiusKm || 0) > 0) {
        const stationRing = buildCirclePolygon(
          Number(station.latitude),
          Number(station.longitude),
          Number(station.coverageRadiusKm || 0),
        );

        (map as any).addSource(stationSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [stationRing] },
          },
        });

        (map as any).addLayer({
          id: stationFillId,
          type: 'fill',
          source: stationSourceId,
          paint: {
            'fill-color': '#8b5cf6',
            'fill-opacity': 0.12,
          },
        });

        (map as any).addLayer({
          id: stationOutlineId,
          type: 'line',
          source: stationSourceId,
          paint: {
            'line-color': '#7c3aed',
            'line-width': 2,
            'line-dasharray': [2, 1],
          },
        });
      }

      campaigns.forEach((campaign) => {
        if (!hasValidCoordinates(campaign.latitude, campaign.longitude)) return;
        if (Number(campaign.areaRadiusKm || 0) <= 0) return;

        const sourceId = `campaign-area-source-${campaign.campaignId}`;
        const fillId = `campaign-area-fill-${campaign.campaignId}`;
        const outlineId = `campaign-area-outline-${campaign.campaignId}`;
        const campaignRing = buildCirclePolygon(
          Number(campaign.latitude),
          Number(campaign.longitude),
          Number(campaign.areaRadiusKm || 0),
        );
        const isSelected = campaign.campaignId === selectedCampaignId;

        (map as any).addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [campaignRing] },
          },
        });

        (map as any).addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': isSelected ? '#f59e0b' : '#10b981',
            'fill-opacity': isSelected ? 0.16 : 0.1,
          },
        });

        (map as any).addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': isSelected ? '#d97706' : '#059669',
            'line-width': isSelected ? 2.5 : 2,
            'line-dasharray': [2, 1],
          },
        });
      });
    };

    if ((map as any).isStyleLoaded()) {
      drawAreas();
    } else {
      map.on('load', drawAreas);
    }

    return () => {
      map.off('load', drawAreas);
      clearLayers();
    };
  }, [
    campaigns,
    map,
    selectedCampaignId,
    station.coverageRadiusKm,
    station.latitude,
    station.longitude,
    stationHasCoordinates,
  ]);

  useEffect(() => {
    if (!map) return;

    const points = [
      ...(stationHasCoordinates
        ? [{ lat: Number(station.latitude), lng: Number(station.longitude) }]
        : []),
      ...campaigns
        .filter((campaign) => hasValidCoordinates(campaign.latitude, campaign.longitude))
        .map((campaign) => ({ lat: Number(campaign.latitude), lng: Number(campaign.longitude) })),
    ];

    if (points.length === 0) return;

    if (selectedCampaignId) {
      const selectedCampaign = campaigns.find(
        (campaign) => campaign.campaignId === selectedCampaignId,
      );
      if (
        selectedCampaign &&
        hasValidCoordinates(selectedCampaign.latitude, selectedCampaign.longitude)
      ) {
        (map as any).flyTo({
          center: [Number(selectedCampaign.longitude), Number(selectedCampaign.latitude)],
          zoom: 12,
          speed: 1,
        });
        return;
      }
    }

    if (points.length === 1) {
      (map as any).flyTo({
        center: [points[0].lng, points[0].lat],
        zoom: stationHasCoordinates ? 11 : 10,
        speed: 1,
      });
      return;
    }

    const bounds = new goongjs.LngLatBounds(
      [points[0].lng, points[0].lat],
      [points[0].lng, points[0].lat],
    );
    points.slice(1).forEach((point) => bounds.extend([point.lng, point.lat]));

    (map as any).fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 0 });
  }, [
    campaigns,
    map,
    selectedCampaignId,
    station.latitude,
    station.longitude,
    stationHasCoordinates,
  ]);

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border overflow-hidden bg-muted/20',
        heightClass,
      )}
    >
      <div ref={mapRef} className="h-full w-full" />

      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 max-w-[calc(100%-2rem)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          <span className="size-3 rounded-full bg-violet-600" /> Trạm phụ trách
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          <span className="size-3 rounded-full bg-emerald-600" /> Chiến dịch đang quản lý
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          <span className="size-3 rounded-full bg-amber-500" /> Chiến dịch đang chọn
        </div>
        {showOpenLargeMapButton && onOpenLargeMap && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur hover:bg-background"
            onClick={onOpenLargeMap}
          >
            <span className="material-symbols-outlined text-sm">open_in_full</span>
            Mở bản đồ lớn
          </button>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-[1px] text-sm text-muted-foreground">
          Đang tải bản đồ khu vực điều phối...
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 px-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && !stationHasCoordinates && campaigns.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 px-6 text-center">
          <div>
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              location_off
            </span>
            <p className="mt-3 font-semibold text-foreground">Chưa có dữ liệu bản đồ hợp lệ</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Trạm chưa có tọa độ và chưa ghi nhận chiến dịch nào có vị trí để hiển thị.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReliefStationPage() {
  const { station, isLoading, isError, refetch } = useMyReliefStation();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [openMapSheet, setOpenMapSheet] = useState(false);
  const [mapFocusTarget, setMapFocusTarget] = useState<MapFocusTarget>('station');

  const { data: campaignListResponse, isLoading: isLoadingCampaignSummaries } = useQuery({
    queryKey: ['coordinator', 'station-page', 'campaigns', station?.locationId],
    queryFn: async () => {
      const response = await campaignService.getAll({
        pageIndex: 1,
        pageSize: 200,
        locationId: station?.locationId,
      });
      return response.data;
    },
    enabled: !!station?.locationId,
  });

  const campaignSummaries = useMemo(
    () => (campaignListResponse?.items || []) as CampaignSummary[],
    [campaignListResponse],
  );

  const campaignDetailQueries = useQueries({
    queries: campaignSummaries.map((campaign) => ({
      queryKey: ['coordinator', 'station-page', 'campaign-detail', campaign.campaignId],
      queryFn: async () => {
        const response = await campaignService.getById(campaign.campaignId);
        return response.data;
      },
      enabled: !!station?.reliefStationId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const stationReliefStationId = station?.reliefStationId || '';

  const managedCampaigns = campaignSummaries.reduce<ManagedCampaign[]>((acc, summary, index) => {
    if (!stationReliefStationId) return acc;

    const detail = campaignDetailQueries[index]?.data as Campaign | undefined;
    if (!detail) return acc;

    const activeAssignment = (detail.stations || []).find(
      (campaignStation) =>
        campaignStation.reliefStationId === stationReliefStationId && campaignStation.isActive,
    );

    if (!activeAssignment) return acc;

    acc.push({
      ...detail,
      overallProgressPercent: summary.overallProgressPercent,
      assignedAt: activeAssignment.assignedAt,
    });

    return acc;
  }, []);

  const effectiveSelectedCampaignId =
    selectedCampaignId &&
    managedCampaigns.some((campaign) => campaign.campaignId === selectedCampaignId)
      ? selectedCampaignId
      : managedCampaigns[0]?.campaignId || null;

  const selectedCampaign =
    managedCampaigns.find((campaign) => campaign.campaignId === effectiveSelectedCampaignId) ||
    null;

  const openLargeMapForStation = () => {
    setMapFocusTarget('station');
    setOpenMapSheet(true);
  };

  const openLargeMapForCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setMapFocusTarget('campaign');
    setOpenMapSheet(true);
  };

  const updatedAtText = formatDateTimeVN(station?.updatedAt);

  const activeCampaignCount = managedCampaigns.filter((campaign) => {
    const parsedStatus = parseEnumValue(campaign.status) as CampaignStatus;
    return ACTIVE_CAMPAIGN_STATUSES.some((status) => status === parsedStatus);
  }).length;

  const campaignMapLoading =
    isLoadingCampaignSummaries || campaignDetailQueries.some((query) => query.isLoading);

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-6">
        <div className="mb-2">
          <h1 className="text-3xl md:text-4xl font-black text-primary leading-tight">
            Trạm phụ trách
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg">
            Theo dõi trạm cứu trợ, chiến dịch đang quản lý và phạm vi điều phối trong khu vực.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-[220px] rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-[120px] rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6">
              <Skeleton className="h-[560px] rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-[260px] rounded-2xl" />
                <Skeleton className="h-[280px] rounded-2xl" />
              </div>
            </div>
          </div>
        )}

        {!isLoading && isError && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto size-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-3xl">wifi_off</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Không thể tải thông tin trạm phụ trách
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Hệ thống chưa thể lấy dữ liệu trạm từ máy chủ. Vui lòng thử lại sau ít phút.
              </p>
              <Button variant="primary" onClick={() => refetch()} className="gap-2">
                <span className="material-symbols-outlined">refresh</span>
                Tải lại dữ liệu
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && !station && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto size-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-500 text-3xl">home_pin</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">Chưa có trạm được gán</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Tài khoản điều phối viên hiện chưa được gán vào trạm cứu trợ nào để theo dõi.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && station && (
          <>
            <Card className="overflow-hidden border-border text-white shadow-lg relative">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/images/bg-slogan.png')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-950/82 via-primary/76 to-sky-900/72" />
              <CardContent className="relative z-10 p-6 md:p-8 h-100">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="size-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[28px]">home_pin</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-white/70">
                          Trạm cứu trợ đang phụ trách
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h2
                              className="mt-1 text-2xl md:text-3xl font-black truncate"
                              title={station.name}
                            >
                              {station.name}
                            </h2>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[520px] break-words">
                            {station.name}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="success"
                        appearance="outline"
                        size="sm"
                        className="border-white/20 bg-white/10 text-white gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        {getStatusText(station.status)}
                      </Badge>
                      <Badge
                        variant="outline"
                        appearance="outline"
                        size="sm"
                        className="border-white/20 bg-white/10 text-white gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">layers</span>
                        {getLevelText(station.level)}
                      </Badge>
                      <Badge
                        variant="outline"
                        appearance="outline"
                        size="sm"
                        className="border-white/20 bg-white/10 text-white gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {station.locationName || 'Chưa rõ khu vực'}
                      </Badge>
                    </div>

                    <p className="max-w-3xl text-white/85 leading-7">
                      Theo dõi thông tin vận hành của trạm, vị trí trên bản đồ và các chiến dịch
                      hiện đang được trạm này hỗ trợ điều phối trong khu vực. Khu vực miền Trung
                      thường xuyên chịu ảnh hưởng của bão, lũ lụt và thiên tai, gây thiệt hại lớn
                      đến đời sống và hạ tầng. Việc cập nhật dữ liệu theo thời gian thực giúp các
                      đơn vị nhanh chóng đưa ra quyết định ứng phó phù hợp và hiệu quả hơn. Hệ thống
                      hỗ trợ giám sát liên tục, đảm bảo phân bổ nguồn lực cứu trợ đúng nơi, đúng
                      thời điểm, giảm thiểu rủi ro và tối ưu hóa công tác điều phối. Đồng thời, cung
                      cấp cái nhìn tổng quan giúp nâng cao khả năng phối hợp giữa các lực lượng
                      trong các tình huống khẩn cấp.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:min-w-[360px]">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.14em] font-semibold text-white/70">
                        Điều phối viên phụ trách
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {station.moderatorName || 'Chưa có thông tin'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.14em] font-semibold text-white/70">
                        Số điện thoại liên hệ
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">
                        {station.contactNumber || 'Chưa cập nhật'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.14em] font-semibold text-white/70">
                        Địa chỉ phụ trách
                      </p>
                      <p className="mt-2 text-base font-semibold text-white leading-6">
                        {station.address || 'Chưa cập nhật địa chỉ trạm'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-[0.12em] text-muted-foreground">
                        Trạng thái hoạt động
                      </p>
                      <p
                        className={cn(
                          'text-lg font-black mt-2',
                          getStatusTextClass(station.status),
                        )}
                      >
                        {getStatusText(station.status)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Theo dõi khả năng tiếp nhận và điều phối hiện tại của trạm.
                      </p>
                    </div>
                    <div className="size-11 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">verified</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-[0.12em] text-muted-foreground">
                        Chiến dịch đang quản lý
                      </p>
                      <p className="text-lg font-black text-foreground mt-2">
                        {managedCampaigns.length}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Trong đó có {activeCampaignCount} chiến dịch đang hoạt động hoặc triển khai.
                      </p>
                    </div>
                    <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">campaign</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-[0.12em] text-muted-foreground">
                        Bán kính hỗ trợ
                      </p>
                      <p className="text-lg font-black text-foreground mt-2">
                        {Number(station.coverageRadiusKm || 0) > 0
                          ? `${Number(station.coverageRadiusKm)} km`
                          : 'Chưa thiết lập'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Phạm vi hiển thị trên bản đồ và dùng để đối chiếu vùng phụ trách.
                      </p>
                    </div>
                    <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">radar</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase font-semibold tracking-[0.12em] text-muted-foreground">
                        Cập nhật lần cuối
                      </p>
                      <p className="text-base font-black text-foreground mt-2 leading-6">
                        {updatedAtText}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Mốc thời gian ghi nhận thông tin gần nhất của trạm.
                      </p>
                    </div>
                    <div className="size-11 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">schedule</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6">
              <Card className="border-border bg-card overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap p-1">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <span className="material-symbols-outlined text-primary">map</span>
                        Bản đồ khu vực điều phối
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Hiển thị trạm cứu trợ đang phụ trách và các chiến dịch đang được trạm này
                        quản lý.
                      </p>
                    </div>
                    {campaignMapLoading && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                        <span className="material-symbols-outlined text-sm animate-spin">
                          progress_activity
                        </span>
                        Đang tải chiến dịch trên bản đồ...
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StationCampaignMap
                    station={station}
                    campaigns={managedCampaigns}
                    selectedCampaignId={effectiveSelectedCampaignId}
                    onSelectCampaign={setSelectedCampaignId}
                    onSelectStation={openLargeMapForStation}
                    showOpenLargeMapButton
                    heightClass="h-[600px]"
                    onOpenLargeMap={() =>
                      effectiveSelectedCampaignId
                        ? openLargeMapForCampaign(effectiveSelectedCampaignId)
                        : openLargeMapForStation()
                    }
                  />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="material-symbols-outlined text-emerald-600">campaign</span>
                      Chiến dịch đang quản lý
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 pb-6 pr-2 pl-6">
                    {campaignMapLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((item) => (
                          <Skeleton key={item} className="h-[110px] rounded-2xl" />
                        ))}
                      </div>
                    ) : managedCampaigns.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
                        <span className="material-symbols-outlined text-4xl text-muted-foreground">
                          campaign
                        </span>
                        <p className="mt-3 font-semibold text-foreground">
                          Chưa có chiến dịch nào gắn với trạm này
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Khi trạm được gán vào chiến dịch, danh sách sẽ hiển thị tại đây.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 pr-4 max-h-[640px] overflow-y-auto">
                        {managedCampaigns.map((campaign) => {
                          const isSelected = campaign.campaignId === effectiveSelectedCampaignId;
                          const activeAssignment = (campaign.stations || []).find(
                            (campaignStation) =>
                              campaignStation.reliefStationId === station.reliefStationId &&
                              campaignStation.isActive,
                          );

                          return (
                            <button
                              key={campaign.campaignId}
                              type="button"
                              onClick={() => setSelectedCampaignId(campaign.campaignId)}
                              onDoubleClick={() => openLargeMapForCampaign(campaign.campaignId)}
                              className={cn(
                                'w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm',
                                isSelected
                                  ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/15 ring-1 ring-amber-300/50'
                                  : 'border-border bg-background hover:border-primary/30 hover:bg-muted/20',
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-foreground break-words">
                                      {campaign.name}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      appearance="outline"
                                      size="xs"
                                      className={`gap-1 border ${getCampaignStatusClass(campaign.status)}`}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        {CampaignStatusIcon[
                                          parseEnumValue(campaign.status) as CampaignStatus
                                        ] || getCampaignStatusIcon(campaign.status)}
                                      </span>
                                      {getCampaignStatusLabel(campaign.status)}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground break-words">
                                    {campaign.addressDetail ||
                                      campaign.description ||
                                      'Chưa cập nhật mô tả chiến dịch'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-amber-600 shrink-0">
                                    target
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge
                                  variant="info"
                                  appearance="outline"
                                  size="xs"
                                  className="gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    category
                                  </span>
                                  {getCampaignTypeLabel(campaign.type)}
                                </Badge>
                                <Badge
                                  variant="success"
                                  appearance="outline"
                                  size="xs"
                                  className="gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    calendar_month
                                  </span>
                                  {formatDateVN(campaign.startDate)} -{' '}
                                  {formatDateVN(campaign.endDate)}
                                </Badge>
                              </div>

                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl border border-border bg-muted/15 px-3 py-2">
                                  <p className="text-xs uppercase font-semibold text-muted-foreground">
                                    Vùng chiến dịch
                                  </p>
                                  <p className="mt-1 font-medium text-foreground">
                                    {Number(campaign.areaRadiusKm || 0) > 0
                                      ? `${Number(campaign.areaRadiusKm)} km`
                                      : 'Chưa thiết lập'}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/15 px-3 py-2">
                                  <p className="text-xs uppercase font-semibold text-muted-foreground">
                                    Tiến độ tổng quan
                                  </p>
                                  <p className="mt-1 font-medium text-foreground">
                                    {typeof campaign.overallProgressPercent === 'number'
                                      ? `${Math.round(campaign.overallProgressPercent)}%`
                                      : 'Chưa cập nhật'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                                <p>
                                  Gán vào trạm:{' '}
                                  <span className="font-medium text-foreground">
                                    {activeAssignment?.reliefStationName || station.name}
                                  </span>
                                </p>
                                <p>
                                  Thời điểm gán:{' '}
                                  <span className="font-medium text-foreground">
                                    {formatDateTimeVN(campaign.assignedAt)}
                                  </span>
                                </p>
                              </div>

                              <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                                <span className="material-symbols-outlined text-sm">
                                  open_in_full
                                </span>
                                Nhấp đúp để mở bản đồ lớn
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* {selectedCampaign && (
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="material-symbols-outlined text-amber-600">target</span>
                        Chiến dịch đang chọn trên bản đồ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="font-semibold text-foreground">{selectedCampaign.name}</p>
                      <p className="text-sm text-muted-foreground leading-6">
                        {selectedCampaign.description ||
                          selectedCampaign.addressDetail ||
                          'Chưa cập nhật mô tả chiến dịch.'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-border bg-muted/15 p-3">
                          <p className="text-xs uppercase font-semibold text-muted-foreground">
                            Trạng thái chiến dịch
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {getCampaignStatusLabel(selectedCampaign.status)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/15 p-3">
                          <p className="text-xs uppercase font-semibold text-muted-foreground">
                            Tọa độ chiến dịch
                          </p>
                          <p className="mt-1 font-mono text-xs text-foreground break-all">
                            {formatCoordinatesVN(
                              selectedCampaign.latitude,
                              selectedCampaign.longitude,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => openLargeMapForCampaign(selectedCampaign.campaignId)}
                        >
                          <span className="material-symbols-outlined text-sm">open_in_full</span>
                          Mở bản đồ lớn
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )} */}
              </div>
            </div>

            <Sheet open={openMapSheet} onOpenChange={setOpenMapSheet}>
              <SheetContent side="right" className="w-full sm:max-w-[96vw] p-0 overflow-hidden">
                <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_420px] xl:grid-cols-[minmax(0,1.8fr)_480px]">
                  <div className="min-h-[40vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-border p-4 lg:p-5 bg-background">
                    <StationCampaignMap
                      station={station}
                      campaigns={managedCampaigns}
                      selectedCampaignId={
                        mapFocusTarget === 'campaign' ? effectiveSelectedCampaignId : null
                      }
                      onSelectCampaign={(campaignId: string) => {
                        setSelectedCampaignId(campaignId);
                        setMapFocusTarget('campaign');
                      }}
                      onSelectStation={() => setMapFocusTarget('station')}
                      heightClass="h-full min-h-[480px] lg:min-h-0"
                    />
                  </div>

                  <div className="min-h-0 flex flex-col bg-card">
                    <SheetHeader className="px-6 py-5 border-b border-border">
                      <SheetTitle>Bản đồ chi tiết trạm và chiến dịch</SheetTitle>
                      <SheetDescription>
                        {mapFocusTarget === 'station'
                          ? 'Đang tập trung vào trạm phụ trách và phạm vi hỗ trợ của trạm.'
                          : 'Đang tập trung vào chiến dịch được chọn và vùng hoạt động của chiến dịch.'}
                      </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                      <Card className="border-border bg-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span className="material-symbols-outlined text-violet-600">
                              home_pin
                            </span>
                            Trạm phụ trách
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="font-semibold text-foreground">{station.name}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="success"
                              appearance="outline"
                              size="xs"
                              className="gap-1"
                            >
                              <span className={`material-symbols-outlined text-[14px]`}>
                                verified
                              </span>
                              {getStatusText(station.status)}
                            </Badge>
                            <Badge variant="info" appearance="outline" size="xs" className="gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                location_city
                              </span>
                              {station.locationName || 'Chưa có khu vực'}
                            </Badge>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/15 p-3 text-sm text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium text-foreground">Địa chỉ:</span>{' '}
                              {station.address || 'Chưa cập nhật'}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Liên hệ:</span>{' '}
                              {station.contactNumber || 'Chưa cập nhật'}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Tọa độ:</span>{' '}
                              {formatCoordinatesVN(station.latitude, station.longitude)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={openLargeMapForStation}
                          >
                            <span className="material-symbols-outlined text-sm">my_location</span>
                            Tập trung về trạm
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-border bg-card ">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <span className="material-symbols-outlined text-emerald-600">
                              campaign
                            </span>
                            Các chiến dịch đang quản lý
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {managedCampaigns.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Hiện chưa có chiến dịch nào để hiển thị trong bản đồ lớn.
                            </p>
                          ) : (
                            managedCampaigns.map((campaign) => {
                              const isSelected =
                                campaign.campaignId === effectiveSelectedCampaignId &&
                                mapFocusTarget === 'campaign';
                              return (
                                <button
                                  key={campaign.campaignId}
                                  type="button"
                                  onClick={() => openLargeMapForCampaign(campaign.campaignId)}
                                  className={cn(
                                    'w-full rounded-xl border p-3 text-left transition-all cursor-pointer hover:border-primary',
                                    isSelected
                                      ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/15'
                                      : 'border-border hover:border-primary/30 hover:bg-muted/15',
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-medium text-foreground break-words">
                                        {campaign.name}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {getCampaignStatusLabel(campaign.status)} •{' '}
                                        {getCampaignTypeLabel(campaign.type)}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {formatDateVN(campaign.startDate)} -{' '}
                                        {formatDateVN(campaign.endDate)}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <span className="material-symbols-outlined text-amber-600 shrink-0">
                                        target
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>

                      {selectedCampaign && mapFocusTarget === 'campaign' && (
                        <Card className="border-border bg-card">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <span className="material-symbols-outlined text-amber-600">
                                target
                              </span>
                              Chiến dịch đang được tập trung
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="font-semibold text-foreground">{selectedCampaign.name}</p>
                            <p className="text-sm text-muted-foreground leading-6">
                              {selectedCampaign.description ||
                                selectedCampaign.addressDetail ||
                                'Chưa có mô tả chi tiết.'}
                            </p>
                            <div className="rounded-xl border border-border bg-muted/15 p-3 text-sm text-muted-foreground space-y-1">
                              <p>
                                <span className="font-medium text-foreground">Vị trí:</span>{' '}
                                {formatCoordinatesVN(
                                  selectedCampaign.latitude,
                                  selectedCampaign.longitude,
                                )}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">
                                  Bán kính chiến dịch:
                                </span>{' '}
                                {Number(selectedCampaign.areaRadiusKm || 0) > 0
                                  ? `${Number(selectedCampaign.areaRadiusKm)} km`
                                  : 'Chưa thiết lập'}
                              </p>
                              <p>
                                <span className="font-medium text-foreground">Tiến độ:</span>{' '}
                                {typeof selectedCampaign.overallProgressPercent === 'number'
                                  ? `${Math.round(selectedCampaign.overallProgressPercent)}%`
                                  : 'Chưa cập nhật'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <SheetFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
                      <Button variant="outline" onClick={() => setOpenMapSheet(false)}>
                        Đóng bản đồ lớn
                      </Button>
                    </SheetFooter>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
