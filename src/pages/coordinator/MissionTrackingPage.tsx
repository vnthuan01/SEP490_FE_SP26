import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  rescueRequestService,
  type RescueRequestDetail,
  type RescueOperationDetail,
  type TeamLocationDto,
} from '@/services/rescueRequestService';
import { teamService, type TeamTrackingPoint } from '@/services/teamService';
import { coordinatorNavGroups } from './components/sidebarConfig';
import { getDisasterTypeLabel, getRescueRequestTypeLabel } from '@/enums/beEnums';
import { getDirections } from '@/services/goongService';

const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '';

function decodePolyline(encoded: string): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  return coordinates;
}

const OPERATION_STATUS_STEPS = [
  { key: 'Pending', label: 'Chờ xử lý', icon: 'schedule', color: '#9ca3af' },
  { key: 'Assigned', label: 'Đã gán team', icon: 'assignment_ind', color: '#60a5fa' },
  { key: 'EnRoute', label: 'Đang di chuyển', icon: 'directions_car', color: '#3b82f6' },
  { key: 'Rescuing', label: 'Đang cứu hộ', icon: 'local_fire_department', color: '#f97316' },
  { key: 'RescueCompleted', label: 'Hoàn thành', icon: 'check_circle', color: '#22c55e' },
] as const;

const STATUS_BADGE_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  Pending: {
    label: 'Chờ xử lý',
    cls: 'border-yellow-200 bg-yellow-500/10 text-yellow-600',
    icon: 'schedule',
  },
  Assigned: {
    label: 'Đã gán team',
    cls: 'border-blue-200 bg-blue-500/10 text-blue-700',
    icon: 'assignment_ind',
  },
  EnRoute: {
    label: 'Di chuyển',
    cls: 'border-blue-300 bg-blue-500/15 text-blue-700 animate-pulse',
    icon: 'directions_car',
  },
  Rescuing: {
    label: 'Đang cứu hộ',
    cls: 'border-orange-200 bg-orange-500/10 text-orange-700',
    icon: 'local_fire_department',
  },
  RescueCompleted: {
    label: 'Hoàn thành',
    cls: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
    icon: 'check_circle',
  },
  Returning: {
    label: 'Đang về trạm',
    cls: 'border-violet-200 bg-violet-500/10 text-violet-700',
    icon: 'u_turn_right',
  },
  Closed: {
    label: 'Đã đóng ca',
    cls: 'border-slate-200 bg-slate-500/10 text-slate-500',
    icon: 'lock',
  },
  Cancelled: {
    label: 'Đã hủy',
    cls: 'border-rose-200 bg-rose-500/10 text-rose-700',
    icon: 'cancel',
  },
};

const getStatusBadge = (status?: string | null) => {
  const s = status ?? '';
  return (
    STATUS_BADGE_MAP[s] ?? {
      label: s || '--',
      cls: 'bg-gray-100 text-gray-500 border-gray-300',
      icon: 'help',
    }
  );
};

const DISASTER_TYPE_BADGE: Record<string, { cls: string; icon: string }> = {
  Flood: { cls: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'water' },
  Earthquake: { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'sensors' },
  Landslide: { cls: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'landslide' },
  Fire: { cls: 'bg-red-100 text-red-800 border-red-200', icon: 'local_fire_department' },
  Storm: { cls: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: 'storm' },
};

const REQUEST_TYPE_COLOR: Record<string | number, string> = {
  Emergency: 'bg-red-500 text-white',
  Urgent: 'bg-orange-500 text-white',
  Normal: 'bg-green-500 text-white',
  0: 'bg-green-500 text-white',
  1: 'bg-orange-500 text-white',
  2: 'bg-red-500 text-white',
};

const formatDate = (v?: string | null) => {
  if (!v) return '--';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '--' : d.toLocaleString('vi-VN');
};

const getRequestId = (r: { requestId?: string; rescueRequestId?: string; id?: string }) =>
  String(r.requestId ?? r.rescueRequestId ?? r.id ?? '');

const MISSION_PAGE_SIZE = 5;

const buildPageItems = (currentPage: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 1) return [1];
  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  sorted.forEach((page, index) => {
    const prev = sorted[index - 1];
    if (prev && page - prev > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
};

function safeRemoveLayer(map: any, id: string) {
  try {
    if (map.getLayer(id)) map.removeLayer(id);
  } catch (_error) {
    void _error;
  }
}

function safeRemoveSource(map: any, id: string) {
  try {
    if (map.getSource(id)) map.removeSource(id);
  } catch (_error) {
    void _error;
  }
}

function OperationTimeline({ status }: { status?: string | null }) {
  const stepIndex = OPERATION_STATUS_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === 'Cancelled';

  return (
    <div className="w-full overflow-x-auto pb-2">
      {isCancelled ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          <span className="material-symbols-outlined text-base">cancel</span>
          Ca cứu hộ đã bị hủy
        </div>
      ) : (
        <div className="flex min-w-max items-center gap-0">
          {OPERATION_STATUS_STEPS.map((step, idx) => {
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                      isDone
                        ? 'border-green-500 bg-green-500 text-white'
                        : isCurrent
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md shadow-blue-200'
                          : 'border-gray-200 bg-gray-50 text-gray-400',
                    )}
                    style={isCurrent ? { borderColor: step.color, color: step.color } : undefined}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isDone ? 'check' : step.icon}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'max-w-[64px] whitespace-normal text-center text-[10px] font-medium leading-tight',
                      isDone
                        ? 'text-green-600'
                        : isCurrent
                          ? 'font-bold text-blue-700'
                          : 'text-gray-400',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < OPERATION_STATUS_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-1 mt-[-12px] h-0.5 w-8',
                      idx < stepIndex ? 'bg-green-400' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EtaBadge({ minutes }: { minutes?: number | null }) {
  if (minutes == null) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-bold text-white shadow">
      <span className="material-symbols-outlined text-base">timer</span>
      ETA: ~{minutes} phút
    </div>
  );
}

export default function MissionTrackingPage() {
  const [requests, setRequests] = useState<RescueRequestDetail[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isListError, setIsListError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [listPage, setListPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<RescueRequestDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [teamLocation, setTeamLocation] = useState<TeamLocationDto | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<TeamTrackingPoint[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoongMap | null>(null);
  const victimMarkerRef = useRef<Marker | null>(null);
  const teamMarkerRef = useRef<Marker | null>(null);
  const detailIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentOperation = useMemo<RescueOperationDetail | null>(() => {
    if (!detail?.rescueOperations?.length) return null;
    const ops = [...(detail.rescueOperations ?? [])] as RescueOperationDetail[];
    ops.sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime());
    return ops[0];
  }, [detail]);

  const opStatus = currentOperation?.status ?? null;
  const isEnRoute = opStatus === 'EnRoute';
  const isRescuing = opStatus === 'Rescuing';
  const isCompleted = opStatus === 'RescueCompleted';
  const isPostMission = isRescuing || isCompleted;
  const showMap = isEnRoute || isRescuing;

  const victimCoords = useMemo(() => {
    const lat = Number(detail?.latitude);
    const lng = Number(detail?.longitude);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  }, [detail?.latitude, detail?.longitude]);

  const teamCoords = useMemo(() => {
    const lat = teamLocation?.currentLatitude ?? detail?.assignedRescueTeam?.currentLatitude;
    const lng = teamLocation?.currentLongitude ?? detail?.assignedRescueTeam?.currentLongitude;
    if (!lat || !lng) return null;
    return { lat, lng };
  }, [teamLocation, detail?.assignedRescueTeam]);

  const completionAttachments = useMemo(
    () =>
      (detail?.attachments ?? []).filter(
        (a) =>
          a.attachmentType === 1 ||
          a.attachmentType === '1' ||
          a.attachmentType === 'CompletionEvidence',
      ),
    [detail?.attachments],
  );

  const requestEvidenceAttachments = useMemo(
    () =>
      (detail?.attachments ?? []).filter(
        (a) =>
          a.attachmentType === 'RequestEvidence' ||
          a.attachmentType === 0 ||
          a.attachmentType === '0' ||
          a.attachmentType == null,
      ),
    [detail?.attachments],
  );

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter(
      (r) =>
        !term ||
        (r.reporterFullName ?? '').toLowerCase().includes(term) ||
        (r.address ?? '').toLowerCase().includes(term) ||
        (r.reporterPhone ?? '').toLowerCase().includes(term) ||
        String(r.disasterType ?? '')
          .toLowerCase()
          .includes(term),
    );
  }, [requests, search]);

  const totalListPages = Math.max(1, Math.ceil(filteredRequests.length / MISSION_PAGE_SIZE));

  useEffect(() => {
    setListPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (listPage > totalListPages) setListPage(totalListPages);
  }, [listPage, totalListPages]);

  useEffect(() => {
    setPageInput(String(listPage));
  }, [listPage]);

  const paginatedRequests = useMemo(() => {
    const start = (listPage - 1) * MISSION_PAGE_SIZE;
    return filteredRequests.slice(start, start + MISSION_PAGE_SIZE);
  }, [filteredRequests, listPage]);

  const listPageItems = buildPageItems(listPage, totalListPages);

  const handleJumpToPage = () => {
    const nextPage = Number(pageInput);
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(listPage));
      return;
    }
    setListPage(Math.min(Math.max(1, Math.trunc(nextPage)), totalListPages));
  };

  const missionStats = useMemo(() => {
    const statuses = requests.map(
      (req) => (req.rescueOperations as RescueOperationDetail[] | undefined)?.[0]?.status,
    );
    return {
      total: requests.length,
      pending: statuses.filter((status) => !status || status === 'Pending').length,
      active: statuses.filter(
        (status) => status === 'Assigned' || status === 'EnRoute' || status === 'Rescuing',
      ).length,
      completed: statuses.filter((status) => status === 'RescueCompleted' || status === 'Closed')
        .length,
    };
  }, [requests]);

  const loadList = useCallback(async () => {
    try {
      setIsListError(false);
      const result = await rescueRequestService.getRequests(statusFilter, 1, 50);
      setRequests(result.items as RescueRequestDetail[]);
    } catch {
      setIsListError(true);
    } finally {
      setIsListLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsListLoading(true);
    loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;
    setIsDetailLoading(true);
    try {
      const data = await rescueRequestService.getById(id);
      setDetail(data);
    } catch {
      toast.error('Không tải được chi tiết yêu cầu.');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
    if (detailIntervalRef.current) clearInterval(detailIntervalRef.current);
    detailIntervalRef.current = setInterval(() => loadDetail(selectedId), 30_000);
    return () => {
      if (detailIntervalRef.current) clearInterval(detailIntervalRef.current);
    };
  }, [selectedId, loadDetail]);

  const stopLocationPolling = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  }, []);

  const startLocationPolling = useCallback(
    (requestId: string) => {
      stopLocationPolling();
      const poll = async () => {
        try {
          const loc = await rescueRequestService.getTeamLocation(requestId);
          setTeamLocation(loc);
          if (loc.operationStatus !== 'EnRoute') {
            stopLocationPolling();
            loadDetail(requestId);
          }
        } catch {
          void 0;
        }
      };
      void poll();
      locationIntervalRef.current = setInterval(poll, 8_000);
    },
    [stopLocationPolling, loadDetail],
  );

  useEffect(() => {
    setTeamLocation(null);
    if (isEnRoute && selectedId) startLocationPolling(selectedId);
    else stopLocationPolling();
    return stopLocationPolling;
  }, [isEnRoute, selectedId, startLocationPolling, stopLocationPolling]);

  useEffect(() => {
    const teamId = detail?.assignedRescueTeam?.teamId;
    if (!teamId || (!isEnRoute && !isPostMission)) {
      setTrackingPoints([]);
      return;
    }
    teamService
      .getTrackingPoints(teamId, 200)
      .then((res) => {
        const pts: TeamTrackingPoint[] = Array.isArray(res.data) ? res.data : [];
        const opId = currentOperation?.rescueOperationId;
        setTrackingPoints(opId ? pts.filter((p) => p.rescueOperationId === opId) : pts);
      })
      .catch(() => {
        void 0;
      });
  }, [
    detail?.assignedRescueTeam?.teamId,
    isEnRoute,
    isPostMission,
    currentOperation?.rescueOperationId,
  ]);

  const mapCallbackRef = useCallback((node: HTMLDivElement | null) => {
    mapContainerRef.current = node;
    if (!node) {
      victimMarkerRef.current?.remove();
      teamMarkerRef.current?.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }
    if (!GOONG_MAP_KEY || mapRef.current) return;
    goongjs.accessToken = GOONG_MAP_KEY;
    mapRef.current = new goongjs.Map({
      container: node,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [108.2022, 16.0544],
      zoom: 5,
    });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    victimMarkerRef.current?.remove();
    victimMarkerRef.current = null;
    if (!victimCoords) return;
    const el = document.createElement('div');
    el.style.cssText =
      'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px';
    el.innerHTML = `
      <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.18);animation:victim-ring 1.8s ease-out infinite"></div>
        <style>@keyframes victim-ring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0}}</style>
        <div style="position:relative;z-index:1;background:linear-gradient(135deg,#dc2626,#ef4444);width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center">
          <span class="material-symbols-outlined" style="color:white;font-size:22px;font-variation-settings:'FILL' 1;">person_alert</span>
        </div>
      </div>
      <div style="background:#dc2626;color:white;font-size:10px;font-weight:800;padding:2px 9px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(220,38,38,0.4);letter-spacing:0.04em;">SOS</div>
    `;

    const victimPopup = new goongjs.Popup({ offset: [0, -56], closeButton: false }).setHTML(
      `<div style="font-family:sans-serif;padding:2px 0;min-width:180px"><p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#991b1b">Vị trí nạn nhân</p>${detail?.reporterFullName ? `<p style="font-size:12px;margin:0 0 2px;color:#374151"><strong>Người báo:</strong> ${detail.reporterFullName}</p>` : ''}${detail?.reporterPhone ? `<p style="font-size:12px;margin:0 0 2px;color:#374151"><strong>SĐT:</strong> ${detail.reporterPhone}</p>` : ''}${detail?.address ? `<p style="font-size:11px;color:#6b7280;margin:4px 0 0">${detail.address}</p>` : ''}</div>`,
    );

    victimMarkerRef.current = new goongjs.Marker({ element: el })
      .setLngLat([victimCoords.lng, victimCoords.lat])
      .setPopup(victimPopup)
      .addTo(map);

    victimMarkerRef.current.togglePopup();
    (map as any).flyTo({
      center: [victimCoords.lng, victimCoords.lat],
      zoom: 13,
      speed: 2.5,
      curve: 1,
    });
  }, [victimCoords, detail]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!showMap) {
      teamMarkerRef.current?.remove();
      teamMarkerRef.current = null;
      return;
    }
    if (!teamCoords) return;
    if (!teamMarkerRef.current) {
      const el = document.createElement('div');
      el.style.cssText =
        'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px';
      el.innerHTML = `
        <div style="position:relative;width:46px;height:46px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.2);animation:team-ring 1.6s ease-out infinite"></div>
          <style>@keyframes team-ring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.2);opacity:0}}</style>
          <div style="position:relative;z-index:1;background:linear-gradient(135deg,#1d4ed8,#2563eb);width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(37,99,235,0.55);display:flex;align-items:center;justify-content:center;animation:team-pulse 2s ease-in-out infinite">
            <style>@keyframes team-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>
            <span class="material-symbols-outlined" style="color:white;font-size:20px;font-variation-settings:'FILL' 1;">local_shipping</span>
          </div>
        </div>
        <div style="background:#1e3a8a;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;white-space:nowrap;box-shadow:0 1px 4px rgba(30,58,138,0.35);">Đội cứu hộ</div>
      `;

      const teamPopup = new goongjs.Popup({ offset: [0, -56], closeButton: false }).setHTML(
        `<div style="font-family:sans-serif;padding:2px 0;min-width:160px"><p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#1e40af">Đội cứu hộ</p>${currentOperation?.teamName ? `<p style="font-size:12px;color:#374151;margin:0 0 2px">${currentOperation.teamName}</p>` : ''}${currentOperation?.stationName ? `<p style="font-size:11px;color:#6b7280;margin:0 0 2px">Trạm: ${currentOperation.stationName}</p>` : ''}${opStatus ? `<p style="font-size:11px;color:#2563eb;font-weight:600;margin:4px 0 0">Trạng thái: ${opStatus}</p>` : ''}</div>`,
      );

      teamMarkerRef.current = new goongjs.Marker({ element: el })
        .setLngLat([teamCoords.lng, teamCoords.lat])
        .setPopup(teamPopup)
        .addTo(map);
    } else {
      teamMarkerRef.current.setLngLat([teamCoords.lng, teamCoords.lat]);
    }
  }, [showMap, teamCoords, currentOperation, opStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      safeRemoveLayer(map, 'track-line');
      safeRemoveSource(map, 'track');
      if (trackingPoints.length < 2) return;
      const coords = trackingPoints.map((p) => [p.longitude, p.latitude]);
      (map as any).addSource('track', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      (map as any).addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#22c55e', 'line-width': 4, 'line-opacity': 0.85 },
      });
    };
    if ((map as any).isStyleLoaded()) draw();
    else (map as any).once('load', draw);
    return () => {
      safeRemoveLayer(map, 'track-line');
      safeRemoveSource(map, 'track');
    };
  }, [trackingPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !teamCoords || !victimCoords) return;
    let cancelled = false;
    const drawRoute = async () => {
      safeRemoveLayer(map, 'direction-line');
      safeRemoveSource(map, 'direction');
      let coords: Array<[number, number]> = [];
      if (GOONG_API_KEY) {
        const direction = await getDirections(
          { lat: teamCoords.lat, lng: teamCoords.lng },
          { lat: victimCoords.lat, lng: victimCoords.lng },
          'car',
          GOONG_API_KEY,
        );
        if (cancelled) return;
        const route = direction?.routes?.[0];
        const overviewPoints = route?.overview_polyline?.points;
        coords = overviewPoints
          ? decodePolyline(overviewPoints)
          : [
              [teamCoords.lng, teamCoords.lat],
              [victimCoords.lng, victimCoords.lat],
            ];
      }
      if (coords.length < 2)
        coords = [
          [teamCoords.lng, teamCoords.lat],
          [victimCoords.lng, victimCoords.lat],
        ];
      if (cancelled || !(map as any).isStyleLoaded()) return;
      (map as any).addSource('direction', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      (map as any).addLayer({
        id: 'direction-line',
        type: 'line',
        source: 'direction',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.85,
          ...(GOONG_API_KEY ? {} : { 'line-dasharray': [4, 3] }),
        },
      });
    };
    if ((map as any).isStyleLoaded()) void drawRoute();
    else (map as any).once('load', () => void drawRoute());
    return () => {
      cancelled = true;
      safeRemoveLayer(map, 'direction-line');
      safeRemoveSource(map, 'direction');
    };
  }, [teamCoords, victimCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !teamCoords || !victimCoords) return;
    (map as any).fitBounds(
      [
        [Math.min(teamCoords.lng, victimCoords.lng), Math.min(teamCoords.lat, victimCoords.lat)],
        [Math.max(teamCoords.lng, victimCoords.lng), Math.max(teamCoords.lat, victimCoords.lat)],
      ],
      { padding: 80, maxZoom: 15, duration: 1200 },
    );
  }, [teamCoords, victimCoords]);

  // Resize map when it becomes visible to avoid blank/cropped rendering
  useEffect(() => {
    if (!showMap) return;
    const map = mapRef.current;
    if (!map) return;
    // Small delay gives the browser time to recalculate layout
    const id = setTimeout(() => (map as any).resize(), 50);
    return () => clearTimeout(id);
  }, [showMap]);

  const handleRecalculateEta = async () => {
    const teamId = detail?.assignedRescueTeam?.teamId;
    if (!teamId) return;
    setIsRecalculating(true);
    try {
      await rescueRequestService.recalculateEta(teamId);
      toast.success('Đã tính lại ETA thành công.');
      if (selectedId) loadDetail(selectedId);
    } catch {
      toast.error('Không thể tính lại ETA.');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <DashboardLayout navGroups={coordinatorNavGroups}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-primary md:text-4xl">Theo dõi mission</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Quan sát hành trình cứu hộ realtime, bản đồ di chuyển, timeline trạng thái và bằng
              chứng hoàn thành.
            </p>
          </div>
          <Button variant="outline" className="h-11 gap-2 px-5" onClick={loadList}>
            <span className="material-symbols-outlined">refresh</span>
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Tổng mission
                  </p>
                  <p className="mt-3 text-3xl font-black text-foreground">{missionStats.total}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-500/10 text-sky-600">
                  <span className="material-symbols-outlined">radar</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chờ xử lý
                  </p>
                  <p className="mt-3 text-3xl font-black text-amber-600">{missionStats.pending}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-500/10 text-amber-600">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Đang thực hiện
                  </p>
                  <p className="mt-3 text-3xl font-black text-blue-600">{missionStats.active}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-500/10 text-blue-600">
                  <span className="material-symbols-outlined">route</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Hoàn thành
                  </p>
                  <p className="mt-3 text-3xl font-black text-emerald-600">
                    {missionStats.completed}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-500/10 text-emerald-600">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-2xl border-border bg-card xl:h-[calc(100vh-4rem)]">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-b border-border/70 px-5 pb-4 pt-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground">Danh sách mission</h2>
                    <p className="text-xs text-muted-foreground">
                      Chọn mission để xem hành trình cứu hộ, bản đồ realtime và bằng chứng hoàn
                      thành.
                    </p>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                      search
                    </span>
                    <Input
                      className="h-11 border-border bg-background pl-10"
                      placeholder="Tìm tên, SĐT, địa chỉ..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { label: 'Tất cả', value: undefined, icon: 'apps', activeCls: '' },
                        {
                          label: 'Đang xử lý',
                          value: 3,
                          icon: 'progress_activity',
                          activeCls:
                            'border-blue-300 bg-blue-500/15 text-blue-700 hover:bg-blue-500/20',
                        },
                        {
                          label: 'Chờ duyệt',
                          value: 0,
                          icon: 'schedule',
                          activeCls:
                            'border-yellow-300 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20',
                        },
                        {
                          label: 'Hoàn thành',
                          value: 4,
                          icon: 'check_circle',
                          activeCls:
                            'border-emerald-300 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20',
                        },
                      ] as {
                        label: string;
                        value: number | undefined;
                        icon: string;
                        activeCls: string;
                      }[]
                    ).map(({ label, value, icon, activeCls }) => {
                      const isActive = statusFilter === value;
                      return (
                        <Button
                          key={label}
                          size="sm"
                          variant={isActive && !activeCls ? 'primary' : 'outline'}
                          className={cn('rounded-full', isActive && activeCls)}
                          onClick={() => setStatusFilter(value)}
                        >
                          <span className="material-symbols-outlined text-sm">{icon}</span>
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto px-4 py-4">
                {isListLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((k) => (
                      <Skeleton key={k} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                ) : isListError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-500/5 px-4 py-4 text-sm text-rose-600">
                    Không tải được danh sách mission.
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-muted-foreground">
                      search_off
                    </span>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Không có mission phù hợp
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Hãy thử thay đổi từ khóa tìm kiếm hoặc trạng thái cần lọc.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedRequests.map((req) => {
                      const rid = getRequestId(req);
                      const isActive = rid === selectedId;
                      const ops = req.rescueOperations as RescueOperationDetail[] | undefined;
                      const latestOp = ops?.[0];
                      const badge = getStatusBadge(latestOp?.status);
                      const disasterKey = String(req.disasterType ?? '');
                      const disasterBadge = DISASTER_TYPE_BADGE[disasterKey];
                      return (
                        <button
                          key={rid}
                          onClick={() => setSelectedId(rid)}
                          className={cn(
                            'w-full rounded-2xl border border-border p-4 text-left transition-all',
                            isActive
                              ? 'border-primary/40 bg-primary/10 shadow-sm'
                              : 'hover:border-primary/20 hover:bg-accent/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">
                                {req.reporterFullName || '--'}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {req.address || 'Chưa có địa chỉ'}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
                                badge.cls,
                              )}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {badge.icon}
                              </span>
                              {badge.label}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {disasterBadge ? (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                                  disasterBadge.cls,
                                )}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {disasterBadge.icon}
                                </span>
                                {getDisasterTypeLabel(req.disasterType)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                {getDisasterTypeLabel(req.disasterType) || '--'}
                              </span>
                            )}
                            {latestOp?.teamName && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                                <span className="material-symbols-outlined text-sm">groups</span>
                                {latestOp.teamName}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Trang {listPage}/{totalListPages} — {paginatedRequests.length}/
                    {filteredRequests.length} mission
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={listPage <= 1}
                      onClick={() => setListPage((prev) => Math.max(1, prev - 1))}
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                      Trước
                    </Button>
                    {listPageItems.map((item, index) =>
                      item === 'ellipsis' ? (
                        <span key={`ell-${index}`} className="px-1 text-sm text-muted-foreground">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          size="sm"
                          variant={item === listPage ? 'primary' : 'outline'}
                          className="min-w-9"
                          onClick={() => setListPage(item as number)}
                        >
                          {item}
                        </Button>
                      ),
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={listPage >= totalListPages}
                      onClick={() => setListPage((prev) => Math.min(totalListPages, prev + 1))}
                    >
                      Sau
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Button>
                    <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                      <span className="text-xs text-muted-foreground">Tới trang:</span>
                      <Input
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleJumpToPage();
                        }}
                        className="h-8 w-14 border-0 px-2 text-center shadow-none focus-visible:ring-0"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={handleJumpToPage}
                      >
                        Đi
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="min-h-0 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:pr-1">
            <Card className="rounded-2xl border-border bg-card">
              <CardContent className="p-6">
                {!selectedId ? (
                  <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined mb-3 text-5xl text-muted-foreground/40">
                      radar
                    </span>
                    <p className="text-muted-foreground">
                      Chọn một yêu cầu để xem chi tiết mission.
                    </p>
                  </div>
                ) : isDetailLoading && !detail ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-40" />
                  </div>
                ) : !detail ? (
                  <p className="text-sm text-red-500">Không tải được chi tiết.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                            REQUEST_TYPE_COLOR[String(detail.rescueRequestType ?? '')] ??
                              'bg-gray-200 text-gray-700',
                          )}
                        >
                          {getRescueRequestTypeLabel(detail.rescueRequestType)?.toUpperCase() ??
                            'THƯỜNG'}
                        </span>
                        {(() => {
                          const db = DISASTER_TYPE_BADGE[String(detail.disasterType ?? '')];
                          return db ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                db.cls,
                              )}
                            >
                              <span className="material-symbols-outlined text-sm">{db.icon}</span>
                              {getDisasterTypeLabel(detail.disasterType)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              {getDisasterTypeLabel(detail.disasterType) || '--'}
                            </span>
                          );
                        })()}
                        {currentOperation &&
                          (() => {
                            const sb = getStatusBadge(opStatus);
                            return (
                              <span
                                className={cn(
                                  'ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                                  sb.cls,
                                )}
                              >
                                <span className="material-symbols-outlined text-sm">{sb.icon}</span>
                                {sb.label}
                              </span>
                            );
                          })()}
                      </div>
                      <div className="rounded-2xl border border-border p-4">
                        <div className="grid grid-cols-1 gap-1 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-base text-muted-foreground mt-0.5">
                              location_on
                            </span>
                            <p>{detail.address || 'Chưa có địa chỉ'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="material-symbols-outlined text-base text-muted-foreground">
                              person
                            </span>
                            <p>{detail.reporterFullName || '--'}</p>
                            {detail.reporterPhone && (
                              <>
                                <span className="material-symbols-outlined text-base text-muted-foreground">
                                  phone
                                </span>
                                <a
                                  href={`tel:${detail.reporterPhone}`}
                                  className="text-primary hover:underline"
                                >
                                  {detail.reporterPhone}
                                </a>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-muted-foreground">
                              schedule
                            </span>
                            <p>{formatDate(detail.createdAt)}</p>
                          </div>
                        </div>

                        {detail.description && (
                          <>
                            <div className="mt-4 rounded-2xl bg-accent/30 border border-border p-3 text-sm italic text-muted-foreground">
                              "{detail.description}"
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {currentOperation && (
                      <div className="space-y-3">
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                          Trạng thái operation
                        </p>
                        <OperationTimeline status={opStatus} />
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {currentOperation.teamName && (
                            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                              <span className="material-symbols-outlined text-blue-600 text-base">
                                groups
                              </span>
                              <span className="font-medium text-blue-700">
                                {currentOperation.teamName}
                              </span>
                            </div>
                          )}
                          {currentOperation.stationName && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="material-symbols-outlined text-base">home_pin</span>
                              {currentOperation.stationName}
                            </div>
                          )}
                          {currentOperation.startedAt && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="material-symbols-outlined text-base">
                                play_arrow
                              </span>
                              {formatDate(currentOperation.startedAt)}
                            </div>
                          )}
                          {isEnRoute && (
                            <EtaBadge
                              minutes={
                                teamLocation?.estimatedMinutesToArrival ??
                                detail.assignedRescueTeam?.estimatedMinutesToArrival
                              }
                            />
                          )}
                        </div>
                      </div>
                    )}
                    <div className={showMap ? 'space-y-3' : 'invisible h-0 overflow-hidden'}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-blue-500">
                            {isEnRoute ? 'directions_car' : 'local_fire_department'}
                          </span>
                          {isEnRoute
                            ? 'Bản đồ realtime — Team đang di chuyển'
                            : 'Team đang cứu hộ tại hiện trường'}
                        </p>
                        <div className="flex items-center gap-2">
                          {isEnRoute && teamLocation && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              {formatDate(teamLocation.lastTrackedAt)}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={handleRecalculateEta}
                            disabled={isRecalculating}
                          >
                            <span className="material-symbols-outlined text-sm">calculate</span>
                            {isRecalculating ? 'Đang tính...' : 'Recalculate ETA'}
                          </Button>
                        </div>
                      </div>
                      {isEnRoute && teamLocation && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
                            <p className="text-[10px] text-blue-600 font-semibold uppercase">ETA</p>
                            <p className="text-lg font-black text-blue-700">
                              {teamLocation.estimatedMinutesToArrival ?? '--'}
                              <span className="text-xs font-normal"> phút</span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-center">
                            <p className="text-[10px] text-green-600 font-semibold uppercase">
                              Khoảng cách
                            </p>
                            <p className="text-lg font-black text-green-700">
                              {teamLocation.distanceKmToVictim?.toFixed(1) ?? '--'}
                              <span className="text-xs font-normal"> km</span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-purple-50 border border-purple-200 p-2 text-center">
                            <p className="text-[10px] text-purple-600 font-semibold uppercase">
                              Điểm GPS
                            </p>
                            <p className="text-lg font-black text-purple-700">
                              {trackingPoints.length}
                            </p>
                          </div>
                        </div>
                      )}
                      {isRescuing && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 border border-orange-300">
                          <span className="material-symbols-outlined text-orange-500 text-2xl">
                            local_fire_department
                          </span>
                          <div>
                            <p className="font-bold text-orange-800">
                              Team đang cứu hộ tại hiện trường
                            </p>
                            <p className="text-xs text-orange-600">Polling vị trí đã dừng.</p>
                          </div>
                        </div>
                      )}
                      {!GOONG_MAP_KEY ? (
                        <div className="rounded-xl border border-border bg-accent/20 p-6 text-sm text-muted-foreground text-center">
                          Thiếu{' '}
                          <code className="font-mono bg-accent px-1 rounded">
                            VITE_GOONG_MAP_KEY
                          </code>{' '}
                          để hiển thị bản đồ.
                        </div>
                      ) : (
                        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                          <div ref={mapCallbackRef} style={{ height: '380px', width: '100%' }} />
                        </div>
                      )}
                    </div>
                    {isCompleted && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-600">
                            check_circle
                          </span>
                          <h3 className="font-bold text-green-800 text-base">Cứu hộ hoàn thành</h3>
                          {currentOperation?.endedAt && (
                            <span className="text-xs text-green-600 ml-auto">
                              {formatDate(currentOperation.endedAt)}
                            </span>
                          )}
                        </div>
                        {currentOperation?.completionNote && (
                          <div className="bg-white rounded-lg border border-green-200 p-3 text-sm text-gray-700">
                            <p className="text-xs uppercase font-semibold text-green-700 mb-1">
                              Ghi chú team leader
                            </p>
                            <p>{currentOperation.completionNote}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase font-semibold text-green-700 mb-2">
                            Bằng chứng hoàn thành — CompletionEvidence
                            {completionAttachments.length > 0 &&
                              ` (${completionAttachments.length})`}
                          </p>
                          {completionAttachments.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {completionAttachments.map((att, i) => (
                                <a
                                  key={att.attachmentId ?? i}
                                  href={att.fileUrl ?? '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg overflow-hidden border border-green-200 hover:border-green-500 transition-all hover:shadow-md bg-white"
                                >
                                  <img
                                    src={att.fileUrl || ''}
                                    alt={`completion-${i}`}
                                    className="w-full h-28 object-cover"
                                    onError={(e) => {
                                      const el = e.currentTarget as HTMLImageElement;
                                      el.style.display = 'none';
                                      (el.parentElement as HTMLElement).innerHTML =
                                        '<div class="h-28 flex items-center justify-center bg-gray-50"><span class="material-symbols-outlined text-gray-400 text-3xl">broken_image</span></div>';
                                    }}
                                  />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-green-600">
                              Chưa có ảnh bằng chứng hoàn thành.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {requestEvidenceAttachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                          Ảnh yêu cầu ban đầu ({requestEvidenceAttachments.length})
                        </p>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {requestEvidenceAttachments.map((att, i) => (
                            <a
                              key={att.attachmentId ?? i}
                              href={att.fileUrl ?? '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:shadow-md aspect-square bg-accent/20"
                            >
                              <img
                                src={att.fileUrl ?? ''}
                                alt={`req-att-${i}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
