import { useEffect, useMemo, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import { useQueries } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFundContributions, useFundSummary, useFundTransactions } from '@/hooks/useFunds';
import { useGoongMap } from '@/hooks/useGoongMap';
import { useInventories, useInventoryStocks } from '@/hooks/useInventory';
import { useProvincialStations } from '@/hooks/useReliefStations';
import { useVehicles } from '@/hooks/useVehicles';
import { useAnalyzeDisasterRisks } from '@/hooks/useDisasterAnalysis';
import type { AnalyzeDisasterRiskResponse } from '@/services/disasterAnalysisService';
import { reverseGeocodeV2 } from '@/services/goongService';
import { managerNavGroups } from './components/sidebarConfig';
import {
  DisasterType,
  EntityStatus,
  ReliefStationLevel,
  getDisasterTypeLabel,
  getEntityStatusClass,
  getEntityStatusLabel,
} from '@/enums/beEnums';
import { formatNumberVN } from '@/lib/utils';
import { StatCard } from './components/ManagerInventoryShared';

// ─── Disaster helpers ────────────────────────────────────────────────────────

const DISASTER_THEME: Record<
  string,
  { color: string; light: string; cardClass: string; icon: string }
> = {
  [String(DisasterType.Flood)]: {
    color: '#2563eb',
    light: 'rgba(37,99,235,0.18)',
    cardClass: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    icon: 'water',
  },
  [String(DisasterType.Storm)]: {
    color: '#7c3aed',
    light: 'rgba(124,58,237,0.18)',
    cardClass: 'border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300',
    icon: 'thunderstorm',
  },
  [String(DisasterType.Landslide)]: {
    color: '#d97706',
    light: 'rgba(217,119,6,0.18)',
    cardClass: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    icon: 'landslide',
  },
  [String(DisasterType.Fire)]: {
    color: '#dc2626',
    light: 'rgba(220,38,38,0.18)',
    cardClass: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
    icon: 'local_fire_department',
  },
  [String(DisasterType.Earthquake)]: {
    color: '#0f766e',
    light: 'rgba(15,118,110,0.18)',
    cardClass: 'border-teal-500/30 bg-teal-500/5 text-teal-700 dark:text-teal-300',
    icon: 'vibration',
  },
  [String(DisasterType.Other)]: {
    color: '#475569',
    light: 'rgba(71,85,105,0.18)',
    cardClass: 'border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300',
    icon: 'warning',
  },
};

const DISASTER_TYPE_LOOKUP: Record<string, number> = {
  flood: DisasterType.Flood,
  landslide: DisasterType.Landslide,
  earthquake: DisasterType.Earthquake,
  fire: DisasterType.Fire,
  storm: DisasterType.Storm,
  other: DisasterType.Other,
};

const resolveDisasterTypeValue = (value?: string | null) => {
  const key = String(value || '')
    .trim()
    .toLowerCase();
  return key in DISASTER_TYPE_LOOKUP ? DISASTER_TYPE_LOOKUP[key] : DisasterType.Other;
};

const getDisasterTheme = (value?: string | null) => {
  const numericValue = resolveDisasterTypeValue(value);
  return DISASTER_THEME[String(numericValue)] || DISASTER_THEME[String(DisasterType.Other)];
};

const parseRiskLevelVN = (level?: string | null) => {
  const normalized = String(level || '')
    .trim()
    .toLowerCase();
  if (normalized.includes('critical') || normalized.includes('very high'))
    return { label: 'Cực kỳ nguy hiểm', class: 'text-red-600' };
  if (normalized.includes('high') || normalized.includes('cao'))
    return { label: 'Nguy hiểm cao', class: 'text-orange-600' };
  if (normalized.includes('medium') || normalized.includes('trung'))
    return { label: 'Nguy hiểm trung bình', class: 'text-amber-600' };
  if (normalized.includes('low') || normalized.includes('thấp'))
    return { label: 'Nguy hiểm thấp', class: 'text-emerald-600' };
  if (normalized.includes('minimal') || normalized.includes('very low'))
    return { label: 'Rất thấp', class: 'text-sky-600' };
  return { label: level || 'Chưa xác định', class: 'text-muted-foreground' };
};

const parseWeatherConditionVN = (condition?: string | null) => {
  const normalized = String(condition || '')
    .trim()
    .toLowerCase();
  if (normalized.includes('clear') || normalized.includes('sunny')) return 'Trời quang';
  if (normalized.includes('cloudy') || normalized.includes('overcast')) return 'Nhiều mây';
  if (normalized.includes('rain') || normalized.includes('drizzle')) return 'Có mưa';
  if (normalized.includes('storm') || normalized.includes('thunder')) return 'Dông bão';
  if (normalized.includes('fog') || normalized.includes('mist')) return 'Sương mù';
  if (normalized.includes('snow')) return 'Tuyết';
  if (normalized.includes('wind')) return 'Gió mạnh';
  return condition || 'Không rõ';
};

type GeoPoint = {
  latitude: number;
  longitude: number;
};

type StationAnalysisPoint = GeoPoint & {
  label: string;
  context: string;
};

type OnSelectStation = (stationId: string | null) => void;

type OnSelectAnalysis = (analysis: AnalyzeDisasterRiskResponse | null) => void;

const GOONG_API_KEY =
  import.meta.env.VITE_GOONG_API_KEY || import.meta.env.VITE_GOONG_MAP_KEY || '';

const toAnalysisCoordKey = (latitude: number, longitude: number) =>
  `${Number(latitude).toFixed(6)},${Number(longitude).toFixed(6)}`;

const kmToLatitudeDelta = (km: number) => km / 111;

const kmToLongitudeDelta = (km: number, latitude: number) => {
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  return km / (111 * Math.max(Math.abs(cosLat), 0.2));
};

const getPointInRadius = (center: GeoPoint, distanceKm: number, angleDeg: number): GeoPoint => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const latDelta = kmToLatitudeDelta(distanceKm * Math.sin(angleRad));
  const lngDelta = kmToLongitudeDelta(distanceKm * Math.cos(angleRad), center.latitude);

  return {
    latitude: center.latitude + latDelta,
    longitude: center.longitude + lngDelta,
  };
};

const buildStationAnalysisPoints = (stationPoint: GeoPoint, coverageRadiusKm?: number | null) => {
  const radiusKm = Math.max(coverageRadiusKm || 12, 3);
  return [
    {
      ...getPointInRadius(stationPoint, radiusKm * 0.28, 32),
      label: 'Điểm giám sát gần trạm',
      context: 'khu vực lân cận trạm và cụm dân cư gần nhất',
    },
    {
      ...getPointInRadius(stationPoint, radiusKm * 0.58, 154),
      label: 'Điểm giám sát vành đai',
      context: 'vành đai hoạt động của trạm, gồm khu dân cư và hạ tầng lân cận',
    },
    {
      ...getPointInRadius(stationPoint, radiusKm * 0.82, 286),
      label: 'Điểm giám sát ngoại vi',
      context:
        'khu vực rìa phạm vi phủ của trạm, có thể gồm địa hình tự nhiên hoặc vùng ít dân cư hơn',
    },
  ] satisfies StationAnalysisPoint[];
};

// ─── Map for disaster overlay ────────────────────────────────────────────────

function DisasterRiskMap({
  mapStations,
  analyses,
  selectedAnalysis,
  onSelectStation,
  onSelectAnalysis,
  heightClass = 'h-[560px]',
}: {
  mapStations: Array<{
    id: string | null | undefined;
    name: string;
    latitude: number;
    longitude: number;
    coverageRadiusKm?: number | null;
    address?: string | null;
    contactNumber?: string | null;
    level?: number;
    status?: number;
  }>;
  analyses: AnalyzeDisasterRiskResponse[];
  selectedAnalysis: AnalyzeDisasterRiskResponse | null;
  onSelectStation?: OnSelectStation;
  onSelectAnalysis: OnSelectAnalysis;
  heightClass?: string;
}) {
  const mapInstanceRef = useRef<any>(null);
  const stationMarkersRef = useRef<any[]>([]);
  const riskMarkersRef = useRef<any[]>([]);
  const riskPopupsRef = useRef<any[]>([]);

  const center = mapStations[0]
    ? { lat: mapStations[0].latitude, lng: mapStations[0].longitude }
    : { lat: 16.0544, lng: 108.2022 };

  const {
    mapRef,
    map,
    isLoading: isLoadingMap,
    error: mapError,
  } = useGoongMap({
    center,
    zoom: mapStations[0] ? 9 : 6,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: true,
    onMapLoad: (mapInstance) => {
      mapInstanceRef.current = mapInstance;
    },
  });

  // Draw station markers
  useEffect(() => {
    const mapImpl = map || mapInstanceRef.current;
    if (!mapImpl) return;

    stationMarkersRef.current.forEach((marker) => marker.remove());
    stationMarkersRef.current = [];

    mapStations.forEach((station) => {
      const markerColor =
        station.level === ReliefStationLevel.Regional
          ? '#7c3aed'
          : station.level === ReliefStationLevel.Provincial
            ? '#2563eb'
            : '#16a34a';

      const stationLevelLabel =
        station.level === ReliefStationLevel.Regional
          ? 'Trụ sở khu vực'
          : station.level === ReliefStationLevel.Provincial
            ? 'Trạm tỉnh / thành'
            : 'Trạm địa phương';

      const stationPopup = new goongjs.Popup({ closeButton: true, closeOnClick: false, offset: 24 })
        .setHTML(`
          <div style="min-width:240px;max-width:320px;padding:6px 4px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="width:14px;height:14px;border-radius:4px;background:${markerColor};display:inline-block;"></span>
              <span style="font-size:12px;font-weight:700;color:${markerColor};text-transform:uppercase;">${stationLevelLabel}</span>
            </div>
            <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.4;">${station.name}</div>
            <div style="font-size:12px;color:#4b5563;margin-top:6px;">${station.address || 'Chưa có địa chỉ'}</div>
            <div style="font-size:12px;color:#4b5563;margin-top:4px;">Liên hệ: ${station.contactNumber || 'Chưa có'}</div>
            <div style="font-size:12px;color:#4b5563;margin-top:4px;">Phạm vi hoạt động: ${Math.round(station.coverageRadiusKm || 12)} km</div>
            <div style="font-size:12px;color:#2563eb;margin-top:8px;font-weight:600;">Bấm marker thiên tai để xem phân tích AI</div>
          </div>
        `);

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bg-transparent border-0 p-0 cursor-pointer';
      el.innerHTML = `
        <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#ffffff;border:2px solid ${markerColor};border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,0.18);">
          <span class="material-symbols-outlined" style="font-size:18px;color:${markerColor};line-height:1;">home_work</span>
        </span>
      `;
      el.addEventListener('click', () => {
        stationPopup.addTo(mapImpl);
        onSelectStation?.(station.id ?? null);
        (mapImpl as any).flyTo({
          center: [station.longitude, station.latitude],
          zoom: 11,
          speed: 1.1,
        });
      });

      const marker = new goongjs.Marker({ element: el })
        .setLngLat([station.longitude, station.latitude])
        .setPopup(stationPopup)
        .addTo(mapImpl);
      stationMarkersRef.current.push(marker);
    });

    return () => {
      stationMarkersRef.current.forEach((marker) => marker.remove());
      stationMarkersRef.current = [];
    };
  }, [map, mapStations, onSelectStation]);

  // Draw disaster risk markers
  useEffect(() => {
    const mapImpl = map || mapInstanceRef.current;
    if (!mapImpl) return;

    riskMarkersRef.current.forEach((marker) => marker.remove());
    riskMarkersRef.current = [];
    riskPopupsRef.current.forEach((popup) => popup.remove());
    riskPopupsRef.current = [];

    analyses.forEach((analysis) => {
      const theme = getDisasterTheme(analysis.primaryDisasterType);
      const riskVN = parseRiskLevelVN(analysis.heuristic?.riskLevel);
      const weatherVN = parseWeatherConditionVN(analysis.weather?.condition);
      const disasterTypeValue = resolveDisasterTypeValue(analysis.primaryDisasterType);
      const disasterLabel = getDisasterTypeLabel(disasterTypeValue);
      const isSelected = analysis.analysisLogId === selectedAnalysis?.analysisLogId;

      const popup = new goongjs.Popup({ closeButton: false, closeOnClick: false, offset: 22 })
        .setHTML(`
        <div style="min-width:240px;max-width:310px;padding:6px 2px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="width:12px;height:12px;background:${theme.color};border-radius:9999px;flex-shrink:0;"></span>
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:${theme.color};">${disasterLabel}</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.4;">${analysis.locationName}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Thời tiết: ${weatherVN} • ${analysis.weather?.temperatureC?.toFixed(1) ?? '--'}°C</div>
          <div style="font-size:12px;margin-top:4px;font-weight:600;color:${riskVN.class.replace('text-', '')};">Mức rủi ro: ${riskVN.label}</div>
          <div style="font-size:12px;color:#2563eb;margin-top:8px;font-weight:600;">Bấm để xem chi tiết phân tích</div>
        </div>
      `);

      riskPopupsRef.current.push(popup);

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bg-transparent border-0 p-0 cursor-pointer flex items-center gap-1';
      el.innerHTML = `
        <span style="display:flex;align-items:center;justify-content:center;width:${isSelected ? 28 : 24}px;height:${isSelected ? 28 : 24}px;background:${theme.color};border:2px solid #fff;transform:rotate(45deg);border-radius:6px;box-shadow:0 0 0 ${isSelected ? 8 : 5}px ${theme.light};">
          <span class="material-symbols-outlined" style="font-size:15px;color:#fff;transform:rotate(-45deg);line-height:1;">${theme.icon}</span>
        </span>
        <span style="font-size:11px;font-weight:700;background:${theme.color};color:#fff;padding:3px 8px;border-radius:9999px;white-space:nowrap;">${disasterLabel}</span>
      `;
      el.addEventListener('click', () => {
        popup.addTo(mapImpl);
        onSelectAnalysis(analysis);
      });

      const marker = new goongjs.Marker({ element: el })
        .setLngLat([analysis.longitude, analysis.latitude])
        .setPopup(popup)
        .addTo(mapImpl);
      riskMarkersRef.current.push(marker);
    });

    return () => {
      riskMarkersRef.current.forEach((marker) => marker.remove());
      riskMarkersRef.current = [];
      riskPopupsRef.current.forEach((popup) => popup.remove());
      riskPopupsRef.current = [];
    };
  }, [analyses, map, onSelectAnalysis, selectedAnalysis]);

  // Fit bounds when analyses change
  useEffect(() => {
    const mapImpl = map || mapInstanceRef.current;
    if (!mapImpl || (mapStations.length === 0 && analyses.length === 0)) return;

    const points = [
      ...mapStations.map((station) => [station.longitude, station.latitude] as [number, number]),
      ...analyses.map((analysis) => [analysis.longitude, analysis.latitude] as [number, number]),
    ];

    if (points.length === 0) return;
    if (points.length === 1) {
      (mapImpl as any).flyTo({ center: points[0], zoom: 10, duration: 0 });
      return;
    }

    const bounds = new goongjs.LngLatBounds(points[0], points[0]);
    points.slice(1).forEach((point) => bounds.extend(point));
    (mapImpl as any).fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 0 });
  }, [analyses, map, mapStations]);

  return (
    <div
      className={`${heightClass} rounded-2xl border border-border overflow-hidden bg-muted/20 relative`}
    >
      <div ref={mapRef} className="h-full w-full" />

      {/* Legend */}
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 max-w-[calc(100%-2rem)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          <span className="inline-flex size-5 items-center justify-center rounded-md border-2 border-violet-600 text-violet-600">
            <span className="material-symbols-outlined text-[12px]">home_work</span>
          </span>
          Trạm cứu trợ
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          <span className="inline-flex size-5 items-center justify-center rounded-[4px] bg-red-500 text-white rotate-45">
            <span className="material-symbols-outlined -rotate-45 text-[12px]">warning</span>
          </span>
          Nguy cơ thiên tai
        </div>
      </div>

      {isLoadingMap && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
          Đang tải bản đồ...
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/85 text-sm text-destructive px-6 text-center">
          {mapError}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('ALL_INVENTORIES');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalyzeDisasterRiskResponse | null>(
    null,
  );
  const [openMapSheet, setOpenMapSheet] = useState(false);
  const [disasterFilter, setDisasterFilter] = useState<string>('all');

  const { data: fundSummary, isLoading: isLoadingFundSummary } = useFundSummary();
  const { data: fundContributions = [] } = useFundContributions();
  const { data: fundTransactions = [] } = useFundTransactions();
  const { data: stationsData, isLoading: isLoadingStations } = useProvincialStations({
    pageIndex: 1,
    pageSize: 200,
  });
  const { data: inventoriesData, isLoading: isLoadingInventories } = useInventories({
    pageIndex: 1,
    pageSize: 200,
  });
  const { data: inventoryStocksData } = useInventoryStocks(
    selectedInventoryId === 'ALL_INVENTORIES' ? '' : selectedInventoryId,
    { pageIndex: 1, pageSize: 200 },
  );
  const { vehicles, vehiclesPagination, isLoadingVehicles } = useVehicles(undefined, undefined, {
    pageIndex: 1,
    pageSize: 10,
    search: vehicleSearch || undefined,
  });

  const stations = useMemo(() => stationsData?.items || [], [stationsData]);
  const inventories = useMemo(() => inventoriesData?.items || [], [inventoriesData]);
  const inventoryStocks = useMemo(() => inventoryStocksData?.items || [], [inventoryStocksData]);
  const selectedInventory = inventories.find(
    (inventory) => inventory.inventoryId === selectedInventoryId,
  );

  const allVisibleStocks = useMemo(() => {
    if (selectedInventoryId === 'ALL_INVENTORIES') {
      return inventories.map((inventory) => ({
        inventoryId: inventory.inventoryId,
        inventoryName: inventory.reliefStationName,
        totalStockSlots: inventory.totalStockSlots,
        status: inventory.status,
      }));
    }
    return inventoryStocks.map((stock) => ({
      kind: 'stock' as const,
      ...stock,
      inventoryId: selectedInventoryId,
      inventoryName: selectedInventory?.reliefStationName || 'Kho đã chọn',
      status: selectedInventory?.status,
    }));
  }, [selectedInventoryId, inventories, inventoryStocks, selectedInventory]);

  const mapStations = useMemo(
    () =>
      stations
        .filter(
          (station) =>
            typeof station.latitude === 'number' && typeof station.longitude === 'number',
        )
        .map((station) => ({
          id: station.reliefStationId ?? station.stationId ?? station.id,
          name: station.name,
          latitude: Number(station.latitude || 0),
          longitude: Number(station.longitude || 0),
          coverageRadiusKm: station.coverageRadiusKm ?? null,
          address: station.address,
          contactNumber: station.contactNumber,
          level: station.level,
          status: station.status,
        })),
    [stations],
  );

  const inventoryOverview = useMemo(() => {
    const totalStockSlots = inventories.reduce(
      (sum, inventory) => sum + (inventory.totalStockSlots || 0),
      0,
    );
    const activeInventories = inventories.filter(
      (inventory) => inventory.status === EntityStatus.Active,
    ).length;
    return {
      totalInventories: inventories.length,
      totalStockSlots,
      activeInventories,
    };
  }, [inventories]);

  const areaLookupQueries = useQueries({
    queries: mapStations.map((station) => ({
      queryKey: [
        'station-analysis-area',
        station.id ?? station.name,
        station.latitude,
        station.longitude,
      ],
      enabled: Boolean(GOONG_API_KEY),
      staleTime: 30 * 60 * 1000,
      retry: 1,
      queryFn: async () => {
        const response = await reverseGeocodeV2(station.latitude, station.longitude, { limit: 1 });
        const result = response.results?.[0];
        return {
          stationId: station.id ?? null,
          areaName:
            result?.compound?.district ||
            result?.compound?.province ||
            result?.formatted_address ||
            station.name,
        };
      },
    })),
  });

  const areaNameByStationId = useMemo(() => {
    const map = new Map<string | null, string>();
    areaLookupQueries.forEach((query) => {
      if (query.data?.stationId) {
        map.set(query.data.stationId, query.data.areaName);
      }
    });
    return map;
  }, [areaLookupQueries]);

  const disasterPayloadsWithMeta = useMemo(
    () =>
      mapStations.flatMap((station) => {
        const stationId = station.id ?? null;
        const stationPoint = {
          latitude: station.latitude,
          longitude: station.longitude,
        };
        const analysisPoints = buildStationAnalysisPoints(stationPoint, station.coverageRadiusKm);
        const areaName = areaNameByStationId.get(stationId) || station.name;

        return analysisPoints.map((point, index) => ({
          stationId,
          pointLabel: point.label,
          payload: {
            latitude: point.latitude,
            longitude: point.longitude,
            locationName: `${station.name} - ${point.label}`,
            additionalContext: `Phân tích nguy cơ thiên tai cho vị trí đại diện số ${index + 1} trong phạm vi hoạt động khoảng ${Math.round(station.coverageRadiusKm || 12)}km của trạm ${station.name}. Khu vực tham chiếu: ${areaName}. Đây là vị trí nằm trong vùng hoạt động của trạm, không phải đúng tọa độ trung tâm trạm. Ngữ cảnh địa bàn: ${point.context}. Địa chỉ trạm: ${station.address || 'Không rõ địa chỉ'}`,
          },
        }));
      }),
    [mapStations, areaNameByStationId],
  );

  const disasterPayloads = useMemo(
    () => disasterPayloadsWithMeta.map(({ payload }) => payload),
    [disasterPayloadsWithMeta],
  );

  const { analyses: disasterAnalyses, isLoading: isLoadingDisaster } =
    useAnalyzeDisasterRisks(disasterPayloads);

  // Filter risk analyses
  const filteredAnalyses = useMemo(() => {
    if (disasterFilter === 'all') return disasterAnalyses;
    return disasterAnalyses.filter(
      (analysis) =>
        String(resolveDisasterTypeValue(analysis.primaryDisasterType)) === disasterFilter,
    );
  }, [disasterAnalyses, disasterFilter]);

  // Top risk analysis
  const topRisk = useMemo(() => {
    if (!disasterAnalyses.length) return null;
    return [...disasterAnalyses].sort(
      (a, b) => (b.heuristic?.overallRiskScore || 0) - (a.heuristic?.overallRiskScore || 0),
    )[0];
  }, [disasterAnalyses]);

  // Map stationId → highest-risk representative analysis in province
  const stationTopAnalysisMap = useMemo(() => {
    const map = new Map<string | null, AnalyzeDisasterRiskResponse>();
    disasterPayloadsWithMeta.forEach((meta) => {
      const coordKey = toAnalysisCoordKey(meta.payload.latitude, meta.payload.longitude);
      const analysis = disasterAnalyses.find(
        (a) => toAnalysisCoordKey(a.latitude, a.longitude) === coordKey,
      );
      if (!analysis) return;
      const current = map.get(meta.stationId);
      if (
        !current ||
        (analysis.heuristic?.overallRiskScore || 0) > (current.heuristic?.overallRiskScore || 0)
      ) {
        map.set(meta.stationId, analysis);
      }
    });
    return map;
  }, [disasterPayloadsWithMeta, disasterAnalyses]);

  const handleSelectStation = (stationId: string | null) => {
    if (stationId) {
      const topAnalysis = stationTopAnalysisMap.get(stationId);
      if (topAnalysis) setSelectedAnalysis(topAnalysis);
    }
  };

  return (
    <DashboardLayout navGroups={managerNavGroups}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary">Báo cáo &amp; Thông số</h1>
            <p className="text-muted-foreground">
              Theo dõi tổng quan quỹ trung tâm, trạm cứu trợ, kho hàng, phương tiện và dự báo thiên
              tai theo khu vực.
            </p>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Quỹ trung tâm"
            value={isLoadingFundSummary ? '...' : formatNumberVN(fundSummary?.totalBalance || 0)}
            icon="savings"
            iconClass="bg-primary/10 text-primary"
            note="Tổng số dư quỹ cứu trợ"
          />
          <StatCard
            label="Số trạm cứu trợ"
            value={isLoadingStations ? '...' : formatNumberVN(stations.length)}
            icon="home_work"
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
            note="Tổng số trạm đang quản lý"
          />
          <StatCard
            label="Kho đang hoạt động"
            value={
              isLoadingInventories ? '...' : formatNumberVN(inventoryOverview.activeInventories)
            }
            icon="inventory_2"
            iconClass="bg-sky-500/10 text-sky-600 dark:text-sky-300"
            note="Số kho có thể nhập/xuất hàng"
          />
          <StatCard
            label="Phương tiện điều phối"
            value={
              isLoadingVehicles
                ? '...'
                : formatNumberVN(vehiclesPagination?.totalCount || vehicles.length)
            }
            icon="local_shipping"
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-300"
            note="Tổng xe đang quản lý"
          />
        </div>

        {/* ── Disaster AI Alert Banner ── */}
        {topRisk && !isLoadingDisaster && (
          <div
            className={`rounded-2xl border p-5 ${getDisasterTheme(topRisk.primaryDisasterType).cardClass} cursor-pointer hover:shadow-sm transition-all`}
            onClick={() => {
              setSelectedAnalysis(topRisk);
              setOpenMapSheet(true);
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="size-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${getDisasterTheme(topRisk.primaryDisasterType).light}` }}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {getDisasterTheme(topRisk.primaryDisasterType).icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-lg">
                      Nguy cơ{' '}
                      {getDisasterTypeLabel(resolveDisasterTypeValue(topRisk.primaryDisasterType))}{' '}
                      cấp tỉnh cao nhất
                    </p>
                    <Badge variant="outline" appearance="outline" size="xs" className="border">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                      AI phân tích
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{topRisk.locationName}</p>
                  <p className="mt-1 text-sm opacity-80 line-clamp-2">
                    {topRisk.ai?.summary ||
                      topRisk.heuristic?.topThreats?.[0] ||
                      'Xem bản đồ để biết chi tiết nguy cơ thiên tai trong phạm vi trạm.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge variant="outline" appearance="outline" size="sm" className="border gap-1">
                  <span
                    className={`font-bold ${parseRiskLevelVN(topRisk.heuristic?.riskLevel).class}`}
                  >
                    {parseRiskLevelVN(topRisk.heuristic?.riskLevel).label}
                  </span>
                </Badge>
                <p className="text-xs opacity-70">
                  Điểm rủi ro: {topRisk.heuristic?.overallRiskScore ?? '--'}/100
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">open_in_full</span>
                  Mở bản đồ lớn
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Map Card with disaster + station overlays ── */}
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">map</span>
                </div>
                <div>
                  <CardTitle>Bản đồ trạm &amp; Dự báo thiên tai AI</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Hiển thị vị trí các trạm và nguy cơ thiên tai trong phạm vi tỉnh/thành quản lý.
                    Bấm vào marker để xem chi tiết.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={disasterFilter} onValueChange={setDisasterFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Lọc loại thiên tai" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả thiên tai</SelectItem>
                    <SelectItem value={String(DisasterType.Flood)}>Lũ lụt</SelectItem>
                    <SelectItem value={String(DisasterType.Storm)}>Bão</SelectItem>
                    <SelectItem value={String(DisasterType.Landslide)}>Sạt lở đất</SelectItem>
                    <SelectItem value={String(DisasterType.Fire)}>Cháy rừng / Hoả hoạn</SelectItem>
                    <SelectItem value={String(DisasterType.Earthquake)}>Động đất</SelectItem>
                    <SelectItem value={String(DisasterType.Other)}>Khác</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2" onClick={() => setOpenMapSheet(true)}>
                  <span className="material-symbols-outlined text-sm">open_in_full</span>
                  Mở bản đồ lớn
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick risk stats */}
            {!isLoadingDisaster && disasterAnalyses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {disasterAnalyses.slice(0, 6).map((analysis) => {
                  const theme = getDisasterTheme(analysis.primaryDisasterType);
                  const riskVN = parseRiskLevelVN(analysis.heuristic?.riskLevel);
                  return (
                    <button
                      key={analysis.analysisLogId}
                      type="button"
                      onClick={() => {
                        setSelectedAnalysis(analysis);
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm ${
                        selectedAnalysis?.analysisLogId === analysis.analysisLogId
                          ? `${theme.cardClass} ring-1 ring-offset-1`
                          : 'border-border bg-background hover:border-primary/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
                      <span className="truncate max-w-[120px]">{analysis.locationName}</span>
                      <span className={`font-bold ${riskVN.class}`}>{riskVN.label}</span>
                    </button>
                  );
                })}
                {isLoadingDisaster && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    Đang phân tích nguy cơ thiên tai...
                  </span>
                )}
              </div>
            )}

            {/* Map */}
            <DisasterRiskMap
              mapStations={mapStations}
              analyses={filteredAnalyses}
              selectedAnalysis={selectedAnalysis}
              onSelectStation={handleSelectStation}
              onSelectAnalysis={setSelectedAnalysis}
              heightClass="h-[520px]"
            />

            {/* Selected analysis card */}
            {selectedAnalysis && (
              <div
                className={`rounded-2xl border p-4 space-y-3 ${getDisasterTheme(selectedAnalysis.primaryDisasterType).cardClass}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="material-symbols-outlined">
                        {getDisasterTheme(selectedAnalysis.primaryDisasterType).icon}
                      </span>
                      <p className="font-bold text-lg">
                        {getDisasterTypeLabel(
                          resolveDisasterTypeValue(selectedAnalysis.primaryDisasterType),
                        )}
                      </p>
                      <Badge
                        variant="outline"
                        appearance="outline"
                        size="xs"
                        className="border gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                        AI phân tích
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium opacity-80">
                      {selectedAnalysis.locationName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMapSheet(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold opacity-80 hover:opacity-100 transition"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_full</span>
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAnalysis(null)}
                      className="rounded-lg p-1.5 opacity-70 hover:opacity-100 transition"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>

                {selectedAnalysis.ai?.summary && (
                  <p className="text-sm leading-7 opacity-90">{selectedAnalysis.ai.summary}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3 text-center">
                    <p className="text-xs opacity-70">Mức rủi ro</p>
                    <p
                      className={`mt-1 font-bold text-sm ${parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).class}`}
                    >
                      {parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).label}
                    </p>
                  </div>
                  <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3 text-center">
                    <p className="text-xs opacity-70">Nhiệt độ</p>
                    <p className="mt-1 font-bold text-sm">
                      {selectedAnalysis.weather?.temperatureC?.toFixed(1)}°C
                    </p>
                  </div>
                  <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3 text-center">
                    <p className="text-xs opacity-70">Gió</p>
                    <p className="mt-1 font-bold text-sm">
                      {selectedAnalysis.weather?.windKph?.toFixed(1)} km/h
                    </p>
                  </div>
                  <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3 text-center">
                    <p className="text-xs opacity-70">Lượng mưa</p>
                    <p className="mt-1 font-bold text-sm">
                      {selectedAnalysis.weather?.precipMm?.toFixed(1)} mm
                    </p>
                  </div>
                </div>

                {selectedAnalysis.ai?.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                      Khuyến nghị ứng phó
                    </p>
                    <ul className="space-y-1.5">
                      {selectedAnalysis.ai.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm opacity-90">
                          <span className="material-symbols-outlined text-sm shrink-0">
                            check_circle
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Finance + Inventory ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">savings</span>
                </div>
                <div>
                  <CardTitle>Tổng quan tài chính trung tâm</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tổng hợp quỹ, nguồn đóng góp và các giao dịch tài chính gần đây.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  label="Số lượt đóng góp"
                  value={formatNumberVN(fundSummary?.totalContributionCount || 0)}
                  icon="volunteer_activism"
                  iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-300 text-[18px]"
                  note="Tổng số lượt đóng góp vào quỹ trung tâm"
                />
                <StatCard
                  label="Số chiến dịch nguồn"
                  value={formatNumberVN(fundSummary?.totalSourceCampaigns || 0)}
                  icon="campaign"
                  iconClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                  note="Số chiến dịch đóng góp vào quỹ chung"
                />
                <StatCard
                  label="Giao dịch quỹ"
                  value={formatNumberVN(fundTransactions.length)}
                  icon="receipt_long"
                  iconClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                  note="Tổng số giao dịch tài chính gần đây"
                />
              </div>

              <div className="space-y-3">
                <p className="font-semibold text-foreground">Nguồn quỹ theo chiến dịch</p>
                {fundSummary?.sources?.length ? (
                  fundSummary.sources.map((source, index) => (
                    <div
                      key={`${source.campaignId || index}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-primary/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">campaign</span>
                        </div>
                        <p className="font-medium text-foreground">
                          {source.campaignName || source.campaignId || 'Chiến dịch nguồn'}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatNumberVN(source.amount || 0)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Chưa có nguồn quỹ nào được ghi nhận.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-border bg-rose-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">
                          volunteer_activism
                        </span>
                      </div>
                      <p className="font-semibold text-foreground">Đóng góp gần đây</p>
                    </div>
                    {fundContributions.length ? (
                      fundContributions.slice(0, 4).map((item, index) => (
                        <div
                          key={`${item.contributionId || index}`}
                          className="py-2 text-sm border-b border-border/50 last:border-b-0"
                        >
                          <p className="font-medium text-foreground">
                            {item.donorName || 'Nhà tài trợ ẩn danh'}
                          </p>
                          <p className="text-muted-foreground">
                            {formatNumberVN(item.amount || 0)} •{' '}
                            {item.campaignName || 'Không có chiến dịch'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa có đóng góp nào.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-cyan-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="size-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      </div>
                      <p className="font-semibold text-foreground">Giao dịch quỹ gần đây</p>
                    </div>
                    {fundTransactions.length ? (
                      fundTransactions.slice(0, 4).map((item, index) => (
                        <div
                          key={`${item.transactionId || index}`}
                          className="py-2 text-sm border-b border-border/50 last:border-b-0"
                        >
                          <p className="font-medium text-foreground">
                            {item.type || 'Giao dịch quỹ'}
                          </p>
                          <p className="text-muted-foreground">
                            {formatNumberVN(item.amount || 0)} • {item.note || 'Không có ghi chú'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa có giao dịch quỹ nào.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                </div>
                <div>
                  <CardTitle>Thông số hàng hóa từng kho</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Theo dõi tổng kho hoặc chọn một kho cụ thể để xem chi tiết số lượng tồn.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả kho hoặc chọn 1 kho cụ thể" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_INVENTORIES">Tất cả kho</SelectItem>
                  {inventories.map((inventory) => (
                    <SelectItem key={inventory.inventoryId} value={inventory.inventoryId}>
                      {inventory.reliefStationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                  label="Tổng số kho"
                  value={formatNumberVN(inventoryOverview.totalInventories)}
                  icon="warehouse"
                  iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  note="Tổng số kho đang hiển thị trong hệ thống"
                />
                <StatCard
                  label="Tổng số vật tư lưu trữ"
                  value={formatNumberVN(inventoryOverview.totalStockSlots)}
                  icon="inventory"
                  iconClass="bg-orange-500/10 text-orange-600 dark:text-orange-300"
                  note="Tổng số ô lưu trữ hoặc vị trí hàng hóa hiện có"
                />
              </div>

              {selectedInventoryId !== 'ALL_INVENTORIES' ? (
                inventoryStocks.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vật phẩm</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Tồn tối thiểu</TableHead>
                        <TableHead>Tồn tối đa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryStocks.map((stock) => (
                        <TableRow key={stock.stockId}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {stock.supplyItemName}
                          </TableCell>
                          <TableCell>{formatNumberVN(stock.currentQuantity)}</TableCell>
                          <TableCell>{formatNumberVN(stock.minimumStockLevel)}</TableCell>
                          <TableCell>{formatNumberVN(stock.maximumStockLevel)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                    Kho này chưa có dữ liệu tồn kho chi tiết.
                  </div>
                )
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên kho</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Tổng ô lưu trữ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allVisibleStocks.map((inventory) => (
                      <TableRow key={`${inventory.inventoryId}-${inventory.inventoryName}`}>
                        <TableCell className="font-medium text-foreground">
                          {inventory.inventoryName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            appearance="outline"
                            size="sm"
                            className={`border ${getEntityStatusClass(inventory.status || EntityStatus.Active)}`}
                          >
                            {getEntityStatusLabel(inventory.status || EntityStatus.Active)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatNumberVN(
                            'totalStockSlots' in inventory ? inventory.totalStockSlots || 0 : 0,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Vehicles ── */}
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">local_shipping</span>
              </div>
              <div>
                <CardTitle>Quản lý phương tiện điều phối</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Xem nhanh danh sách phương tiện và điều hướng sang trang quản lý phương tiện để
                  CRUD.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative w-full lg:max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground">
                  search
                </span>
                <Input
                  className="pl-10"
                  placeholder="Tìm kiếm biển số xe..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/10 px-4 py-2 text-sm text-muted-foreground">
                Thêm / sửa / xóa phương tiện thực hiện tại trang{' '}
                <span className="font-semibold text-foreground">Quản lý phương tiện</span>.
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Biển số xe</TableHead>
                  <TableHead>Loại xe</TableHead>
                  <TableHead>Đội sử dụng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingVehicles ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Đang tải phương tiện...
                    </TableCell>
                  </TableRow>
                ) : vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Chưa có phương tiện nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((vehicle) => (
                    <TableRow key={vehicle.vehicleId}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{vehicle.licensePlate}</p>
                          <p className="text-xs text-muted-foreground uppercase">
                            ID: {vehicle.vehicleId.slice(0, 8)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.vehicleTypeName || '—'}</TableCell>
                      <TableCell>
                        {vehicle.currentUsingTeamName ||
                          vehicle.teamUsed ||
                          vehicle.teamName ||
                          '—'}
                      </TableCell>
                      <TableCell>
                        {vehicle.status === 0 ? (
                          <Badge variant="success" size="xs">
                            Sẵn sàng
                          </Badge>
                        ) : vehicle.status === 1 ? (
                          <Badge variant="warning" size="xs">
                            Đang sử dụng
                          </Badge>
                        ) : (
                          <Badge variant="destructive" size="xs">
                            Bảo trì
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" appearance="outline" size="sm">
                          Quản lý tại trang riêng
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Large Map Sheet ── */}
      <Sheet open={openMapSheet} onOpenChange={setOpenMapSheet}>
        <SheetContent side="right" className="w-full sm:max-w-[97vw] p-0 overflow-hidden">
          <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.75fr)_480px]">
            <div className="relative min-h-[50vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-border p-4 lg:p-5 bg-background">
              <DisasterRiskMap
                mapStations={mapStations}
                analyses={filteredAnalyses}
                selectedAnalysis={selectedAnalysis}
                onSelectStation={handleSelectStation}
                onSelectAnalysis={setSelectedAnalysis}
                heightClass="h-full min-h-[520px] lg:min-h-0"
              />
            </div>

            <div className="min-h-0 flex flex-col bg-card">
              <SheetHeader className="px-6 py-5 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">storm</span>
                  Dự báo thiên tai AI &amp; Bản đồ trạm
                </SheetTitle>
                <SheetDescription>
                  Phân tích nguy cơ thiên tai do AI trong phạm vi tỉnh/thành mà trạm đang quản lý.
                  Bấm vào marker trên bản đồ để chọn khu vực xem chi tiết.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Risk list */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-red-500">radar</span>
                    Các nguy cơ thiên tai đã phân tích ({filteredAnalyses.length})
                  </p>
                  {isLoadingDisaster ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 flex items-center gap-3">
                      <span className="material-symbols-outlined animate-spin text-primary">
                        progress_activity
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Đang phân tích nguy cơ thiên tai theo tỉnh/thành…
                      </p>
                    </div>
                  ) : filteredAnalyses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 text-center">
                      <span className="material-symbols-outlined text-3xl text-muted-foreground">
                        cloud_done
                      </span>
                      <p className="mt-2 font-semibold text-foreground">
                        Không có nguy cơ thiên tai đáng kể
                      </p>
                    </div>
                  ) : (
                    filteredAnalyses.map((analysis) => {
                      const theme = getDisasterTheme(analysis.primaryDisasterType);
                      const riskVN = parseRiskLevelVN(analysis.heuristic?.riskLevel);
                      const isActive = analysis.analysisLogId === selectedAnalysis?.analysisLogId;
                      const disasterTypeValue = resolveDisasterTypeValue(
                        analysis.primaryDisasterType,
                      );
                      return (
                        <button
                          key={analysis.analysisLogId}
                          type="button"
                          onClick={() => setSelectedAnalysis(analysis)}
                          className={`w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                            isActive
                              ? `${theme.cardClass} ring-1 ring-current`
                              : 'border-border bg-background hover:border-primary/30 hover:bg-muted/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className="material-symbols-outlined text-base"
                                  style={{ color: theme.color }}
                                >
                                  {theme.icon}
                                </span>
                                <p className="font-bold text-foreground">
                                  {getDisasterTypeLabel(disasterTypeValue)}
                                </p>
                                <Badge
                                  variant="outline"
                                  appearance="outline"
                                  size="xs"
                                  className="border"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    auto_awesome
                                  </span>
                                  AI
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {analysis.locationName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Thời tiết: {parseWeatherConditionVN(analysis.weather?.condition)} •{' '}
                                {analysis.weather?.temperatureC?.toFixed(1)}°C
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              appearance="outline"
                              size="sm"
                              className={`border shrink-0 ${theme.cardClass}`}
                            >
                              <span className={`font-semibold ${riskVN.class}`}>
                                {riskVN.label}
                              </span>
                            </Badge>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Detail of selected analysis */}
                {selectedAnalysis && (
                  <Card
                    className={`border ${getDisasterTheme(selectedAnalysis.primaryDisasterType).cardClass} overflow-hidden`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="material-symbols-outlined">
                          {getDisasterTheme(selectedAnalysis.primaryDisasterType).icon}
                        </span>
                        Chi tiết phân tích AI —{' '}
                        {getDisasterTypeLabel(
                          resolveDisasterTypeValue(selectedAnalysis.primaryDisasterType),
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAnalysis.ai?.summary && (
                        <div className="rounded-xl border border-current/20 bg-white/30 dark:bg-black/10 p-4">
                          <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                            Tóm tắt từ AI
                          </p>
                          <p className="text-sm leading-7">{selectedAnalysis.ai.summary}</p>
                        </div>
                      )}

                      {selectedAnalysis.ai?.detailedAnalysis && (
                        <div className="rounded-xl border border-current/20 bg-white/30 dark:bg-black/10 p-4">
                          <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                            Phân tích chi tiết
                          </p>
                          <p className="text-sm leading-7">
                            {selectedAnalysis.ai.detailedAnalysis}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3">
                          <p className="text-xs opacity-70">Điểm rủi ro</p>
                          <p className="mt-1 font-black text-xl">
                            {selectedAnalysis.heuristic?.overallRiskScore ?? '--'}/100
                          </p>
                          <p
                            className={`text-xs font-semibold ${parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).class}`}
                          >
                            {parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).label}
                          </p>
                        </div>
                        <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3">
                          <p className="text-xs opacity-70">Điều kiện thời tiết</p>
                          <p className="mt-1 font-semibold">
                            {parseWeatherConditionVN(selectedAnalysis.weather?.condition)}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            Độ ẩm: {selectedAnalysis.weather?.humidity}% • Gió:{' '}
                            {selectedAnalysis.weather?.windKph?.toFixed(1)} km/h
                          </p>
                        </div>
                      </div>

                      {selectedAnalysis.ai?.recommendations?.length > 0 && (
                        <div>
                          <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                            Khuyến nghị ứng phó
                          </p>
                          <ul className="space-y-2">
                            {selectedAnalysis.ai.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <span className="material-symbols-outlined text-sm shrink-0">
                                  check_circle
                                </span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedAnalysis.heuristic?.topThreats?.length > 0 && (
                        <div>
                          <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                            Mối nguy hàng đầu
                          </p>
                          <ul className="space-y-1.5">
                            {selectedAnalysis.heuristic.topThreats.map((threat, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm opacity-80">
                                <span className="material-symbols-outlined text-sm text-amber-600 shrink-0">
                                  warning
                                </span>
                                {threat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedAnalysis.riskRanking?.length > 0 && (
                        <div>
                          <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                            Xếp hạng nguy cơ theo loại thiên tai
                          </p>
                          <div className="space-y-2">
                            {selectedAnalysis.riskRanking.slice(0, 4).map((rank, index) => {
                              const rankType = resolveDisasterTypeValue(rank.disasterType);
                              const rankTheme = getDisasterTheme(rank.disasterType);
                              const rankRiskVN = parseRiskLevelVN(rank.riskLevel);
                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-current/15 bg-white/20 dark:bg-black/10 px-3 py-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="material-symbols-outlined text-sm"
                                      style={{ color: rankTheme.color }}
                                    >
                                      {rankTheme.icon}
                                    </span>
                                    <span className="text-sm font-medium">
                                      {getDisasterTypeLabel(rankType)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-sm">{rank.riskScore}/100</span>
                                    <span className={`text-xs ${rankRiskVN.class}`}>
                                      {rankRiskVN.label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-4 space-y-1">
                        <p className="text-xs uppercase font-semibold opacity-70">
                          Thông tin phân tích
                        </p>
                        <p className="text-xs opacity-70">
                          Mô hình AI: {selectedAnalysis.ai?.model || 'Không rõ'} • Nhà cung cấp:{' '}
                          {selectedAnalysis.ai?.provider || 'Không rõ'}
                        </p>
                        <p className="text-xs opacity-70">
                          Thời điểm phân tích:{' '}
                          {selectedAnalysis.ai?.analyzedAt
                            ? new Date(selectedAnalysis.ai.analyzedAt).toLocaleString('vi-VN')
                            : new Date(selectedAnalysis.weather?.observedAt).toLocaleString(
                                'vi-VN',
                              )}
                        </p>
                        {selectedAnalysis.heuristic?.dataLimitationNote && (
                          <p className="text-xs opacity-60">
                            Lưu ý: {selectedAnalysis.heuristic.dataLimitationNote}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <SheetFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
                <Button variant="outline" onClick={() => setOpenMapSheet(false)}>
                  Đóng bản đồ
                </Button>
              </SheetFooter>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
