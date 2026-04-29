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
import { DisasterForecastMapPanel } from './components/DisasterForecastMapPanel';

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

const getEffectiveDisasterType = (analysis: AnalyzeDisasterRiskResponse) =>
  analysis.primaryDisasterType ||
  analysis.ai?.primaryRiskType ||
  analysis.ai?.requestedRiskType ||
  analysis.requestedDisasterType ||
  analysis.riskRanking?.[0]?.disasterType ||
  String(DisasterType.Other);

const getDisplayDisasterLabel = (analysis: AnalyzeDisasterRiskResponse) => {
  const effectiveType = getEffectiveDisasterType(analysis);
  const numericValue = resolveDisasterTypeValue(effectiveType);
  if (numericValue === DisasterType.Other) {
    return analysis.weather?.baseWeatherRiskLevel?.toLowerCase() === 'low'
      ? 'Thời tiết ổn định'
      : 'Thời tiết cần theo dõi';
  }
  return getDisasterTypeLabel(numericValue);
};

const getAnalysisPriorityScore = (analysis: AnalyzeDisasterRiskResponse) => {
  const heuristicScore = Number(analysis.heuristic?.overallRiskScore || 0);
  const severeRisk = Math.max(
    0,
    ...(analysis.forecast?.days?.map((day) => Number(day.severeRisk || 0)) || [0]),
  );
  const maxDailyPrecip = Number(analysis.forecast?.maxDailyPrecipMm || 0);
  const detectedConcernsBonus = Number(analysis.ai?.detectedConcerns?.length || 0) * 8;

  return heuristicScore + severeRisk * 0.8 + maxDailyPrecip * 2 + detectedConcernsBonus;
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
  return { label: 'Nguy hiểm thấp', class: 'text-emerald-600' };
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

const getWeatherIcon = (condition?: string | null) => {
  const normalized = String(condition || '')
    .trim()
    .toLowerCase();
  if (normalized.includes('clear') || normalized.includes('sunny')) return 'wb_sunny';
  if (normalized.includes('cloud')) return 'partly_cloudy_day';
  if (normalized.includes('rain') || normalized.includes('drizzle')) return 'rainy';
  if (normalized.includes('storm') || normalized.includes('thunder')) return 'thunderstorm';
  return 'cloud';
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
  highlightedAnalysisId,
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
  highlightedAnalysisId?: string | null;
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
      const theme = getDisasterTheme(getEffectiveDisasterType(analysis));
      const riskVN = parseRiskLevelVN(analysis.heuristic?.riskLevel);
      const weatherVN = parseWeatherConditionVN(analysis.weather?.condition);
      const weatherIcon = getWeatherIcon(analysis.weather?.condition);
      const disasterLabel = getDisplayDisasterLabel(analysis);
      const isSelected = analysis.analysisLogId === selectedAnalysis?.analysisLogId;
      const isHighlighted = analysis.analysisLogId === highlightedAnalysisId;
      const probabilityPct = Math.round(Number(analysis.heuristic?.overallRiskScore || 0));

      const popup = new goongjs.Popup({ closeButton: false, closeOnClick: false, offset: 22 })
        .setHTML(`
        <div style="min-width:240px;max-width:310px;padding:6px 2px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="width:12px;height:12px;background:${theme.color};border-radius:9999px;flex-shrink:0;"></span>
            <span style="font-size:12px;font-weight:700;text-transform:uppercase;color:${theme.color};">${disasterLabel}</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.4;">${analysis.locationName}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;display:flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;line-height:1;">${weatherIcon}</span>Thời tiết: ${weatherVN} • ${analysis.weather?.temperatureC?.toFixed(1) ?? '--'}°C</div>
          <div style="font-size:12px;margin-top:4px;font-weight:600;color:${riskVN.class.replace('text-', '')};">Mức rủi ro: ${riskVN.label}</div>
          <div style="font-size:12px;margin-top:4px;font-weight:700;color:${theme.color};">Xác suất: ${probabilityPct}%</div>
          <div style="font-size:12px;color:#2563eb;margin-top:8px;font-weight:600;">Bấm để xem chi tiết phân tích</div>
        </div>
      `);

      riskPopupsRef.current.push(popup);

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bg-transparent border-0 p-0 cursor-pointer';
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <span style="display:flex;align-items:center;justify-content:center;width:${isSelected ? 30 : 26}px;height:${isSelected ? 30 : 26}px;background:${theme.color};border:2px solid #fff;border-radius:999px;box-shadow:0 0 0 ${isHighlighted ? 14 : isSelected ? 10 : 5}px ${theme.light};animation:${isHighlighted ? 'managerRiskPulseStrong 0.8s ease-in-out infinite' : isSelected ? 'managerRiskBreathing 1.5s ease-in-out infinite' : 'none'};">
            <span class="material-symbols-outlined" style="font-size:15px;color:#fff;line-height:1;">${weatherIcon}</span>
          </span>
          <div style="display:flex;flex-direction:column;align-items:center;background:#fff;border:1px solid ${theme.color};border-radius:8px;padding:4px 6px;box-shadow:0 6px 16px rgba(15,23,42,0.16);min-width:90px;">
            <span style="font-size:12px;line-height:1.1;font-weight:800;color:${theme.color};">${probabilityPct}%</span>
            <span style="font-size:10px;line-height:1.1;color:#334155;white-space:nowrap;">Bão lũ dự báo</span>
          </div>
        </div>
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
  }, [analyses, highlightedAnalysisId, map, onSelectAnalysis, selectedAnalysis]);

  useEffect(() => {
    const mapImpl = map || mapInstanceRef.current;
    if (!mapImpl || !selectedAnalysis) return;
    (mapImpl as any).flyTo({
      center: [selectedAnalysis.longitude, selectedAnalysis.latitude],
      zoom: 11,
      speed: 1.1,
      essential: true,
    });
  }, [map, selectedAnalysis]);

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
      <div className="absolute left-4 bottom-4 z-10 rounded-xl border border-border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur space-y-1">
        <p className="font-semibold">Chú thích thời tiết</p>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">wb_sunny</span>Trời đẹp
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">partly_cloudy_day</span>Có mây
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">rainy</span>Có mưa
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">thunderstorm</span>Dông bão
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
  const [highlightedAnalysisId, setHighlightedAnalysisId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

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

  const selectAnalysisWithPulse = (analysis: AnalyzeDisasterRiskResponse | null) => {
    setSelectedAnalysis(analysis);
    if (!analysis?.analysisLogId) return;
    setHighlightedAnalysisId(analysis.analysisLogId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedAnalysisId((current) => (current === analysis.analysisLogId ? null : current));
    }, 2000);
  };

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
            typeof station.latitude === 'number' &&
            typeof station.longitude === 'number' &&
            Number(station.status) === EntityStatus.Active,
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
        String(resolveDisasterTypeValue(getEffectiveDisasterType(analysis))) === disasterFilter,
    );
  }, [disasterAnalyses, disasterFilter]);

  // Top risk analysis
  const topRisk = useMemo(() => {
    if (!disasterAnalyses.length) return null;
    return [...disasterAnalyses].sort(
      (a, b) => getAnalysisPriorityScore(b) - getAnalysisPriorityScore(a),
    )[0];
  }, [disasterAnalyses]);

  const shouldShowTopRiskBanner = useMemo(() => {
    if (!topRisk) return false;
    const typeValue = resolveDisasterTypeValue(getEffectiveDisasterType(topRisk));
    const isStableWeatherOnly =
      typeValue === DisasterType.Other &&
      topRisk.weather?.baseWeatherRiskLevel?.toLowerCase() === 'low';
    return !isStableWeatherOnly;
  }, [topRisk]);

  const openMapSheetWithSelection = () => {
    if (!selectedAnalysis && filteredAnalyses.length > 0) {
      const preferred = topRisk
        ? filteredAnalyses.find((item) => item.analysisLogId === topRisk.analysisLogId)
        : null;
      setSelectedAnalysis(preferred || filteredAnalyses[0]);
    }
    setOpenMapSheet(true);
  };

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
        {topRisk && !isLoadingDisaster && shouldShowTopRiskBanner && (
          <div
            className={`rounded-2xl border p-5 ${getDisasterTheme(getEffectiveDisasterType(topRisk)).cardClass} cursor-pointer hover:shadow-sm transition-all`}
            onClick={() => {
              setSelectedAnalysis(topRisk);
              openMapSheetWithSelection();
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="size-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: `${getDisasterTheme(getEffectiveDisasterType(topRisk)).light}`,
                  }}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {getDisasterTheme(getEffectiveDisasterType(topRisk)).icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-lg">
                      Nguy cơ {getDisplayDisasterLabel(topRisk)} cấp tỉnh cao nhất
                    </p>
                    <Badge variant="outline" appearance="outline" size="xs" className="border">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                      AI phân tích
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{topRisk.locationName}</p>
                  <p className="mt-1 text-sm opacity-80 line-clamp-2">
                    {topRisk.ai?.summary ||
                      topRisk.ai?.detectedConcerns?.[0] ||
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
                  Điểm rủi ro: {Number(topRisk.heuristic?.overallRiskScore ?? 0)}/100
                </p>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">open_in_full</span>
                  Mở bản đồ lớn
                </div>
              </div>
            </div>
          </div>
        )}

        <DisasterForecastMapPanel
          mapStations={mapStations}
          analyses={disasterAnalyses}
          filteredAnalyses={filteredAnalyses}
          selectedAnalysis={selectedAnalysis}
          disasterFilter={disasterFilter}
          isLoadingDisaster={isLoadingDisaster}
          setDisasterFilter={setDisasterFilter}
          setSelectedAnalysis={setSelectedAnalysis}
          onOpenMap={openMapSheetWithSelection}
          onSelectStation={handleSelectStation}
          parseRiskLevelVN={parseRiskLevelVN}
          parseWeatherConditionVN={parseWeatherConditionVN}
          getEffectiveDisasterType={getEffectiveDisasterType}
          getDisasterTheme={getDisasterTheme}
        />

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
                onSelectAnalysis={selectAnalysisWithPulse}
                highlightedAnalysisId={highlightedAnalysisId}
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
                {/* Detail of selected analysis (placed above risk list) */}
                {selectedAnalysis && (
                  <Card
                    className={`border ${getDisasterTheme(getEffectiveDisasterType(selectedAnalysis)).cardClass} overflow-hidden`}
                  >
                    <CardHeader className="pt-5 pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="material-symbols-outlined">
                          {getDisasterTheme(getEffectiveDisasterType(selectedAnalysis)).icon}
                        </span>
                        Chi tiết phân tích AI — {getDisplayDisasterLabel(selectedAnalysis)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Điểm đang chọn:{' '}
                        <span className="font-semibold text-foreground">
                          {selectedAnalysis.locationName}
                        </span>
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAnalysis.ai?.summary?.trim() ? (
                        <div className="rounded-xl border border-current/20 bg-white/30 dark:bg-black/10 p-4">
                          <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                            Tóm tắt từ AI
                          </p>
                          <p className="text-sm leading-7">{selectedAnalysis.ai.summary}</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-current/20 bg-white/30 dark:bg-black/10 p-4">
                          <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                            Nhận định tạm thời từ dữ liệu
                          </p>
                          <ul className="space-y-1 text-sm list-disc pl-5">
                            <li>
                              Điểm rủi ro hiện tại:{' '}
                              {Number(selectedAnalysis.heuristic?.overallRiskScore ?? 0)}/100
                            </li>
                            <li>
                              Mưa cao nhất dự báo:{' '}
                              {selectedAnalysis.forecast?.maxDailyPrecipMm?.toFixed(1) ?? '0.0'} mm
                              vào{' '}
                              {selectedAnalysis.forecast?.peakRainDate
                                ? new Date(
                                    selectedAnalysis.forecast.peakRainDate,
                                  ).toLocaleDateString('vi-VN')
                                : '--/--'}
                            </li>
                            <li>
                              Điều kiện hiện tại:{' '}
                              {parseWeatherConditionVN(selectedAnalysis.weather?.condition)},{' '}
                              {selectedAnalysis.weather?.temperatureC?.toFixed(1) ?? '0.0'}°C
                            </li>
                          </ul>
                        </div>
                      )}
                      {selectedAnalysis.ai?.detailedAnalysis?.trim() && (
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
                            {Number(selectedAnalysis.heuristic?.overallRiskScore ?? 0)}/100
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
                      <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3">
                        <p className="text-xs opacity-70">Cập nhật lần gần nhất</p>
                        <p className="mt-1 font-semibold text-sm">
                          {selectedAnalysis.ai?.analyzedAt
                            ? new Date(selectedAnalysis.ai.analyzedAt).toLocaleString('vi-VN')
                            : new Date(
                                selectedAnalysis.forecast?.generatedAt ||
                                  selectedAnalysis.weather?.observedAt,
                              ).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                      const theme = getDisasterTheme(getEffectiveDisasterType(analysis));
                      const riskVN = parseRiskLevelVN(analysis.heuristic?.riskLevel);
                      const isActive = analysis.analysisLogId === selectedAnalysis?.analysisLogId;
                      const disasterTypeLabel = getDisplayDisasterLabel(analysis);
                      return (
                        <button
                          key={analysis.analysisLogId}
                          type="button"
                          onClick={() => selectAnalysisWithPulse(analysis)}
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
                                <p className="font-bold text-foreground">{disasterTypeLabel}</p>
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
