import { useEffect, useRef } from 'react';
import goongjs from '@goongmaps/goong-js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoongMap } from '@/hooks/useGoongMap';
import type { AnalyzeDisasterRiskResponse } from '@/services/disasterAnalysisService';
import { DisasterType, ReliefStationLevel } from '@/enums/beEnums';

type Station = {
  id: string | null | undefined;
  name: string;
  latitude: number;
  longitude: number;
  coverageRadiusKm?: number | null;
  address?: string | null;
  contactNumber?: string | null;
  level?: number;
};

type Theme = { color: string; light: string; cardClass: string; icon: string };

const weatherIcon = (condition?: string | null) => {
  const normalized = String(condition || '').toLowerCase();
  if (normalized.includes('clear') || normalized.includes('sunny')) return 'wb_sunny';
  if (normalized.includes('cloud')) return 'partly_cloudy_day';
  if (normalized.includes('rain') || normalized.includes('drizzle')) return 'rainy';
  if (normalized.includes('storm') || normalized.includes('thunder')) return 'thunderstorm';
  return 'cloud';
};

export function DisasterForecastMapPanel(props: {
  mapStations: Station[];
  analyses: AnalyzeDisasterRiskResponse[];
  filteredAnalyses: AnalyzeDisasterRiskResponse[];
  selectedAnalysis: AnalyzeDisasterRiskResponse | null;
  disasterFilter: string;
  isLoadingDisaster: boolean;
  setDisasterFilter: (v: string) => void;
  setSelectedAnalysis: (v: AnalyzeDisasterRiskResponse | null) => void;
  onOpenMap: () => void;
  onSelectStation: (stationId: string | null) => void;
  parseRiskLevelVN: (level?: string | null) => { label: string; class: string };
  parseWeatherConditionVN: (condition?: string | null) => string;
  getEffectiveDisasterType: (analysis: AnalyzeDisasterRiskResponse) => string;
  getDisasterTheme: (value?: string | null) => Theme;
}) {
  const {
    mapStations,
    analyses,
    filteredAnalyses,
    selectedAnalysis,
    disasterFilter,
    isLoadingDisaster,
    setDisasterFilter,
    setSelectedAnalysis,
    onOpenMap,
    onSelectStation,
    parseRiskLevelVN,
    parseWeatherConditionVN,
    getEffectiveDisasterType,
    getDisasterTheme,
  } = props;

  const mapRef = useRef<any>(null);
  const stationMarkersRef = useRef<any[]>([]);
  const riskMarkersRef = useRef<any[]>([]);
  const center = mapStations[0]
    ? { lat: mapStations[0].latitude, lng: mapStations[0].longitude }
    : { lat: 16.0544, lng: 108.2022 };
  const { mapRef: domRef, map } = useGoongMap({
    center,
    zoom: mapStations[0] ? 9 : 6,
    apiKey: import.meta.env.VITE_GOONG_MAP_KEY || '',
    enabled: true,
    onMapLoad: (m) => (mapRef.current = m),
  });

  useEffect(() => {
    const mapImpl = map || mapRef.current;
    if (!mapImpl) return;
    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];
    mapStations.forEach((station) => {
      const markerColor =
        station.level === ReliefStationLevel.Regional
          ? '#7c3aed'
          : station.level === ReliefStationLevel.Provincial
            ? '#2563eb'
            : '#16a34a';
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bg-transparent border-0 p-0 cursor-pointer';
      el.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#fff;border:2px solid ${markerColor};border-radius:10px;"><span class="material-symbols-outlined" style="font-size:18px;color:${markerColor};">home_work</span></span>`;
      el.addEventListener('click', () => onSelectStation(station.id ?? null));
      stationMarkersRef.current.push(
        new goongjs.Marker({ element: el })
          .setLngLat([station.longitude, station.latitude])
          .addTo(mapImpl),
      );
    });
  }, [map, mapStations, onSelectStation]);

  useEffect(() => {
    const mapImpl = map || mapRef.current;
    if (!mapImpl) return;
    riskMarkersRef.current.forEach((m) => m.remove());
    riskMarkersRef.current = [];
    filteredAnalyses.forEach((analysis) => {
      const theme = getDisasterTheme(getEffectiveDisasterType(analysis));
      const icon = weatherIcon(analysis.weather?.condition);
      const probability = Math.round(Number(analysis.heuristic?.overallRiskScore || 0));
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'bg-transparent border-0 p-0 cursor-pointer';
      const isSelected = analysis.analysisLogId === selectedAnalysis?.analysisLogId;
      el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:${theme.color};border:2px solid #fff;border-radius:999px;box-shadow:0 0 0 ${isSelected ? 10 : 5}px ${theme.light};animation:${isSelected ? 'managerRiskBreathing 1.5s ease-in-out infinite' : 'none'};"><span class="material-symbols-outlined" style="font-size:16px;color:#fff;">${icon}</span></span><div style="display:flex;flex-direction:column;align-items:center;background:#fff;border:1px solid ${theme.color};border-radius:8px;padding:4px 6px;box-shadow:0 6px 16px rgba(15,23,42,0.16);min-width:86px;"><span style="font-size:12px;line-height:1.1;font-weight:800;color:${theme.color};">${probability}%</span><span style="font-size:10px;line-height:1.1;color:#334155;white-space:nowrap;">Bão lũ dự báo</span></div></div>`;
      el.addEventListener('click', () => setSelectedAnalysis(analysis));
      riskMarkersRef.current.push(
        new goongjs.Marker({ element: el })
          .setLngLat([analysis.longitude, analysis.latitude])
          .addTo(mapImpl),
      );
    });
  }, [
    map,
    filteredAnalyses,
    getDisasterTheme,
    getEffectiveDisasterType,
    setSelectedAnalysis,
    selectedAnalysis,
  ]);

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[28px] text-violet-600">map</span>
            <CardTitle>Bản đồ trạm &amp; Dự báo thiên tai AI</CardTitle>
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
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={onOpenMap}>
              Mở bản đồ lớn
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[520px] rounded-2xl border border-border overflow-hidden bg-muted/20 relative">
          <div ref={domRef} className="h-full w-full" />
          <div className="absolute left-4 bottom-4 z-10 rounded-xl bg-background/95 border border-border p-3 text-xs space-y-2">
            <div className="font-semibold">Chú thích</div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">wb_sunny</span> Trời đẹp
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">partly_cloudy_day</span> Có mây
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">rainy</span> Có mưa
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">thunderstorm</span> Dông bão
            </div>
          </div>
        </div>
        {selectedAnalysis && (
          <div
            className={`rounded-2xl border p-4 ${getDisasterTheme(getEffectiveDisasterType(selectedAnalysis)).cardClass}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold">{selectedAnalysis.locationName}</div>
              <Badge variant="outline" appearance="outline" size="xs">
                {Math.round(Number(selectedAnalysis.heuristic?.overallRiskScore || 0))}%
              </Badge>
            </div>
            <div className="mt-2 text-sm">
              Thời tiết: {parseWeatherConditionVN(selectedAnalysis.weather?.condition)}
            </div>
            <div
              className={`mt-1 text-sm font-semibold ${parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).class}`}
            >
              {parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).label}
            </div>
            {selectedAnalysis.ai?.summary?.trim() ? (
              <div className="mt-2 text-sm">{selectedAnalysis.ai.summary}</div>
            ) : (
              <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
                <li>
                  Điểm rủi ro hiện tại: {Number(selectedAnalysis.heuristic?.overallRiskScore ?? 0)}
                  /100
                </li>
                <li>
                  Mưa cao nhất dự báo:{' '}
                  {selectedAnalysis.forecast?.maxDailyPrecipMm?.toFixed(1) ?? '0.0'} mm vào{' '}
                  {selectedAnalysis.forecast?.peakRainDate
                    ? new Date(selectedAnalysis.forecast.peakRainDate).toLocaleDateString('vi-VN')
                    : '--/--'}
                </li>
                <li>
                  Điều kiện hiện tại: {parseWeatherConditionVN(selectedAnalysis.weather?.condition)}
                  , {selectedAnalysis.weather?.temperatureC?.toFixed(1) ?? '0.0'}°C
                </li>
              </ul>
            )}
          </div>
        )}
        {isLoadingDisaster && (
          <div className="text-xs text-muted-foreground">Đang phân tích dữ liệu AI...</div>
        )}
        {analyses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {analyses.slice(0, 6).map((analysis) => (
              <button
                key={analysis.analysisLogId}
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                onClick={() => setSelectedAnalysis(analysis)}
              >
                {analysis.locationName}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
