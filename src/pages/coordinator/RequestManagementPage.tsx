import { useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useRescueRequestManagement } from '@/hooks/useRescueRequestManagement';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import type { RescueRequestItem } from '@/services/rescueRequestService';
import { getDirections } from '@/services/goongService';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';
import { toast } from 'sonner';
import {
  getDisasterTypeLabel,
  getRescueRequestTypeLabel,
  getVerificationStatusLabel,
  getVerificationStatusClass,
  VerificationMethod,
  VerificationMethodLabel,
} from '@/enums/beEnums';

const verificationStatusText = (status?: number | string | null) =>
  getVerificationStatusLabel(status);

const verificationStatusClass = (status?: number | string | null) =>
  getVerificationStatusClass(status);

const verificationMethodLabel = (method: number) =>
  VerificationMethodLabel[method as VerificationMethod] ?? `Phương thức #${method}`;

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('vi-VN');
};

const getRequestId = (req: RescueRequestItem) =>
  String(req.requestId ?? req.rescueRequestId ?? req.id ?? '');

const getVerification = (req?: RescueRequestItem) => req?.verifications?.[0];

const formatKm = (value?: number | null) => (value == null ? '-- km' : `${value.toFixed(2)} km`);
const formatMin = (value?: number | null) => (value == null ? '-- phút' : `${value} phút`);
const formatMeters = (value?: number | null) =>
  value == null ? '-- m' : `${value.toLocaleString('vi-VN')} m`;
const formatSeconds = (value?: number | null) =>
  value == null ? '-- giây' : `${value.toLocaleString('vi-VN')} giây`;

const attachmentTypeLabel = (type?: number | string | null) => {
  if (type === 0 || type === '0' || type === 'RequestEvidence') return 'Bằng chứng yêu cầu';
  if (type === 1 || type === '1' || type === 'CompletionEvidence') return 'Bằng chứng hoàn thành';
  return 'Khác';
};

const ROUTE_SOURCE_ID = 'request-route-source';
const ROUTE_LAYER_ID = 'request-route-layer';
const COVERAGE_SOURCE_ID = 'station-coverage-source';
const COVERAGE_FILL_LAYER_ID = 'station-coverage-fill';
const COVERAGE_OUTLINE_LAYER_ID = 'station-coverage-outline';

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

function buildCirclePolygon(lat: number, lng: number, radiusKm: number, points = 72): number[][] {
  const ring: number[][] = [];
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i <= points; i += 1) {
    const angle = (2 * Math.PI * i) / points;
    ring.push([lng + lngRadius * Math.cos(angle), lat + latRadius * Math.sin(angle)]);
  }

  return ring;
}

const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || '';

export default function CoordinatorRequestManagementPage() {
  const {
    requests,
    paging,
    isLoading,
    isError,
    refetch,
    verifyRequest,
    verifyStatus,
    rejectRequest,
    rejectStatus,
  } = useRescueRequestManagement(1, 10);
  const { station } = useMyReliefStation();

  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [selectedId, setSelectedId] = useState('');

  const [verifyMethod, setVerifyMethod] = useState(1);
  const [verifyNote, setVerifyNote] = useState('');

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectMethod, setRejectMethod] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const [actionError, setActionError] = useState('');

  const requestMapContainerRef = useRef<HTMLDivElement | null>(null);
  const requestMapRef = useRef<GoongMap | null>(null);
  const requestMarkerRef = useRef<Marker | null>(null);
  const stationMarkerRef = useRef<Marker | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((r) => {
      const status = getVerification(r)?.status;
      const matchStatus =
        verificationFilter === 'all'
          ? true
          : verificationFilter === 'pending'
            ? status === 0 || status === '0' || status === 'Pending' || status == null
            : verificationFilter === 'approved'
              ? status === 1 || status === '1' || status === 'Approved'
              : status === 2 || status === '2' || status === 'Rejected';

      const matchSearch =
        !term ||
        (r.reporterFullName || '').toLowerCase().includes(term) ||
        (r.reporterPhone || '').toLowerCase().includes(term) ||
        (r.address || '').toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term) ||
        (r.disasterType || '').toLowerCase().includes(term);

      return matchStatus && matchSearch;
    });
  }, [requests, search, verificationFilter]);

  const effectiveSelectedId = useMemo(() => {
    if (!filtered.length) return '';
    const found = filtered.some((r) => getRequestId(r) === selectedId);
    return found ? selectedId : getRequestId(filtered[0]);
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((r) => getRequestId(r) === effectiveSelectedId),
    [filtered, effectiveSelectedId],
  );
  const verification = getVerification(selected);
  const currentStatus = verification?.status;
  const isPending =
    currentStatus === 0 ||
    currentStatus === '0' ||
    currentStatus === 'Pending' ||
    currentStatus == null;

  const selectedCoordinates = useMemo(() => {
    const lat = Number(selected?.latitude);
    const lng = Number(selected?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [selected?.latitude, selected?.longitude]);

  const stationCoordinates = useMemo(() => {
    const lat = Number(station?.latitude);
    const lng = Number(station?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [station?.latitude, station?.longitude]);

  const coverageRadiusKm = useMemo(() => {
    const radius = Number((station as any)?.coverageRadiusKm);
    if (Number.isFinite(radius) && radius > 0) return radius;
    return null;
  }, [station]);

  const requestEvidenceAttachments = useMemo(
    () =>
      (selected?.attachments || []).filter(
        (att: any) =>
          att?.attachmentType === 0 ||
          att?.attachmentType === '0' ||
          att?.attachmentType === 'RequestEvidence' ||
          att?.attachmentType == null,
      ),
    [selected?.attachments],
  );

  const completionEvidenceAttachments = useMemo(
    () =>
      (selected?.attachments || []).filter(
        (att: any) =>
          att?.attachmentType === 1 ||
          att?.attachmentType === '1' ||
          att?.attachmentType === 'CompletionEvidence',
      ),
    [selected?.attachments],
  );

  useEffect(() => {
    if (!requestMapContainerRef.current || !GOONG_MAP_KEY) return;

    goongjs.accessToken = GOONG_MAP_KEY;
    requestMapRef.current = new goongjs.Map({
      container: requestMapContainerRef.current,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [108.2022, 16.0544],
      zoom: 5,
    });

    return () => {
      if (requestMarkerRef.current) {
        requestMarkerRef.current.remove();
        requestMarkerRef.current = null;
      }
      if (requestMapRef.current) {
        requestMapRef.current.remove();
        requestMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map) return;

    if (stationMarkerRef.current) {
      stationMarkerRef.current.remove();
      stationMarkerRef.current = null;
    }

    if (!stationCoordinates) return;

    const stationMarkerElement = document.createElement('div');
    stationMarkerElement.className = 'flex items-center gap-1';
    stationMarkerElement.innerHTML = `
      <span style="width:10px;height:10px;background:#8b5cf6;border-radius:9999px;box-shadow:0 0 0 4px rgba(139,92,246,.25);"></span>
      <span style="font-size:11px;font-weight:700;background:#6d28d9;color:#fff;padding:2px 6px;border-radius:9999px;white-space:nowrap;">Trạm hiện tại</span>
    `;

    stationMarkerRef.current = new goongjs.Marker({ element: stationMarkerElement })
      .setLngLat([stationCoordinates.lng, stationCoordinates.lat])
      .addTo(map);
  }, [stationCoordinates]);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map) return;

    const drawCoverage = () => {
      if ((map as any).getLayer(COVERAGE_FILL_LAYER_ID)) {
        try {
          (map as any).removeLayer(COVERAGE_FILL_LAYER_ID);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
      if ((map as any).getLayer(COVERAGE_OUTLINE_LAYER_ID)) {
        try {
          (map as any).removeLayer(COVERAGE_OUTLINE_LAYER_ID);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
      if ((map as any).getSource(COVERAGE_SOURCE_ID)) {
        try {
          (map as any).removeSource(COVERAGE_SOURCE_ID);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }

      if (!stationCoordinates || !coverageRadiusKm) return;

      const circleRing = buildCirclePolygon(
        stationCoordinates.lat,
        stationCoordinates.lng,
        coverageRadiusKm,
      );

      (map as any).addSource(COVERAGE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { radiusKm: coverageRadiusKm },
          geometry: { type: 'Polygon', coordinates: [circleRing] },
        },
      });

      (map as any).addLayer({
        id: COVERAGE_FILL_LAYER_ID,
        type: 'fill',
        source: COVERAGE_SOURCE_ID,
        paint: {
          'fill-color': '#a78bfa',
          'fill-opacity': 0.16,
        },
      });

      (map as any).addLayer({
        id: COVERAGE_OUTLINE_LAYER_ID,
        type: 'line',
        source: COVERAGE_SOURCE_ID,
        paint: {
          'line-color': '#7c3aed',
          'line-width': 2,
          'line-dasharray': [2, 1],
        },
      });
    };

    if ((map as any).isStyleLoaded()) {
      drawCoverage();
      return;
    }

    map.on('load', drawCoverage);
    return () => {
      map.off('load', drawCoverage);
    };
  }, [stationCoordinates, coverageRadiusKm]);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map) return;

    if (requestMarkerRef.current) {
      requestMarkerRef.current.remove();
      requestMarkerRef.current = null;
    }

    if (!selectedCoordinates) return;

    const markerElement = document.createElement('div');
    markerElement.className = 'flex items-center gap-1';
    markerElement.innerHTML = `
      <span style="width:10px;height:10px;background:#ef4444;border-radius:9999px;box-shadow:0 0 0 4px rgba(239,68,68,.25);"></span>
      <span style="font-size:11px;font-weight:700;background:#111827;color:#fff;padding:2px 6px;border-radius:9999px;white-space:nowrap;">Điểm yêu cầu</span>
    `;

    requestMarkerRef.current = new goongjs.Marker({ element: markerElement })
      .setLngLat([selectedCoordinates.lng, selectedCoordinates.lat])
      .addTo(map);

    (map as any).flyTo({
      center: [selectedCoordinates.lng, selectedCoordinates.lat],
      zoom: 14,
      speed: 1,
    });
  }, [selectedCoordinates]);

  useEffect(() => {
    const map = requestMapRef.current;
    if (!map || !GOONG_API_KEY) return;

    const drawRoute = async () => {
      if ((map as any).getLayer(ROUTE_LAYER_ID)) {
        try {
          (map as any).removeLayer(ROUTE_LAYER_ID);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }
      if ((map as any).getSource(ROUTE_SOURCE_ID)) {
        try {
          (map as any).removeSource(ROUTE_SOURCE_ID);
        } catch (_error) {
          // Ignore cleanup errors
        }
      }

      if (!stationCoordinates || !selectedCoordinates) return;

      const direction = await getDirections(
        stationCoordinates,
        selectedCoordinates,
        'car',
        GOONG_API_KEY,
      );
      const route = direction?.routes?.[0];
      const overviewPoints = route?.overview_polyline?.points;

      let coords: Array<[number, number]> = [];

      if (overviewPoints) {
        coords = decodePolyline(overviewPoints);
      } else {
        const stepPolylines = (route?.legs || [])
          .flatMap((leg: any) => leg?.steps || [])
          .map((step: any) => step?.polyline?.points)
          .filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);

        for (const p of stepPolylines) {
          const partial = decodePolyline(p);
          if (!partial.length) continue;

          if (
            coords.length > 0 &&
            partial.length > 0 &&
            coords[coords.length - 1][0] === partial[0][0] &&
            coords[coords.length - 1][1] === partial[0][1]
          ) {
            coords.push(...partial.slice(1));
          } else {
            coords.push(...partial);
          }
        }
      }

      if (coords.length < 2) {
        console.warn('Direction API returned no drawable polyline', direction);
        return;
      }

      (map as any).addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      });

      (map as any).addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.85,
        },
      });

      const bounds = new goongjs.LngLatBounds();
      bounds.extend([stationCoordinates.lng, stationCoordinates.lat]);
      bounds.extend([selectedCoordinates.lng, selectedCoordinates.lat]);
      coords.forEach((c) => bounds.extend(c));
      (map as any).fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 700 });
    };

    if ((map as any).isStyleLoaded()) {
      void drawRoute();
      return;
    }

    const handleLoad = () => {
      void drawRoute();
    };

    map.on('load', handleLoad);

    return () => {
      map.off('load', handleLoad);
    };
  }, [stationCoordinates, selectedCoordinates]);

  const handleVerify = async () => {
    if (!selected) return;
    setActionError('');
    try {
      await verifyRequest({
        requestId: getRequestId(selected),
        payload: {
          status: 1,
          method: verifyMethod,
          note: verifyNote.trim() || undefined,
          reason: undefined,
        },
      });
      setVerifyNote('');
      await refetch();
      toast.success('Đã xác minh yêu cầu cứu hộ thành công!');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể xác minh yêu cầu.';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setActionError('');
    try {
      await rejectRequest({
        requestId: getRequestId(selected),
        payload: { method: rejectMethod, reason, note: rejectNote.trim() || undefined },
      });
      setRejectReason('');
      setRejectNote('');
      setIsRejectOpen(false);
      await refetch();
      toast.success('Đã từ chối yêu cầu cứu hộ.');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Không thể từ chối yêu cầu.';
      setActionError(msg);
      toast.error(msg);
    }
  };

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary">Quản lý yêu cầu cứu hộ</h1>
          <p className="text-muted-foreground mt-1">Liệt kê yêu cầu cứu hộ.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <span className="material-symbols-outlined">refresh</span>
          Tải lại
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardContent className="p-4 space-y-4">
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Tìm tên/SĐT/địa chỉ/mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={verificationFilter === 'all' ? 'primary' : 'outline'}
                onClick={() => setVerificationFilter('all')}
              >
                Tất cả
              </Button>
              <Button
                size="sm"
                variant={verificationFilter === 'pending' ? 'primary' : 'outline'}
                className={cn(
                  verificationFilter === 'pending' &&
                    'bg-amber-400 border-amber-400 text-amber-950 hover:bg-amber-300',
                )}
                onClick={() => setVerificationFilter('pending')}
              >
                <span className="material-symbols-outlined text-base">schedule</span>
                Chờ xác minh
              </Button>
              <Button
                size="sm"
                variant={verificationFilter === 'approved' ? 'primary' : 'outline'}
                onClick={() => setVerificationFilter('approved')}
              >
                Đã xác minh
              </Button>
              <Button
                size="sm"
                variant={verificationFilter === 'rejected' ? 'primary' : 'outline'}
                onClick={() => setVerificationFilter('rejected')}
              >
                Từ chối
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <Skeleton key={k} className="h-12" />
                ))}
              </div>
            ) : isError ? (
              <p className="text-sm text-red-500">Không tải được danh sách yêu cầu.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có yêu cầu phù hợp.</p>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-auto pr-1">
                {filtered.map((req) => {
                  const id = getRequestId(req);
                  const verificationItem = getVerification(req);
                  const isActive = id === selectedId;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={cn(
                        'w-full text-left rounded-lg border p-3 transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">
                          {req.reporterFullName || '--'}
                        </p>
                        <span
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full border font-medium',
                            verificationStatusClass(verificationItem?.status),
                          )}
                        >
                          {verificationStatusText(verificationItem?.status)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {req.disasterType || '--'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {req.address || 'Chưa cập nhật'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatKm(req.stationToRequestDistanceKm)} •{' '}
                        {formatMin(req.stationToRequestDurationMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(req.createdAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Tổng: {paging?.totalCount ?? filtered.length} yêu cầu.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            {!selected ? (
              <p className="text-muted-foreground">Chọn một yêu cầu để xem chi tiết.</p>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-black">{selected.reporterFullName || '--'}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mã yêu cầu: {getRequestId(selected)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-3 py-1 rounded-full border font-semibold',
                      verificationStatusClass(verification?.status),
                    )}
                  >
                    {verificationStatusText(verification?.status)}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-semibold">A. Thông tin yêu cầu</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Loại thiên tai
                        </p>
                        <p className="text-sm">
                          {selected.disasterType != null
                            ? getDisasterTypeLabel(selected.disasterType)
                            : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Loại yêu cầu cứu hộ
                        </p>
                        <p className="text-sm">
                          {selected.rescueRequestType != null
                            ? getRescueRequestTypeLabel(selected.rescueRequestType)
                            : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Mức ưu tiên
                        </p>
                        <p className="text-sm">{selected.priority ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Số điện thoại người báo tin
                        </p>
                        <p className="text-sm">{selected.reporterPhone || '--'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Mô tả
                        </p>
                        <p className="text-sm">{selected.description || 'Không có mô tả'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-semibold">B. Vị trí</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Địa chỉ
                        </p>
                        <p className="text-sm">{selected.address || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Vĩ độ
                        </p>
                        <p className="text-sm">{selected.latitude ?? '--'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Kinh độ
                        </p>
                        <p className="text-sm">{selected.longitude ?? '--'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                          Bản đồ vị trí yêu cầu
                        </p>
                        <div className="rounded-lg border border-border overflow-hidden bg-accent/20">
                          {!GOONG_MAP_KEY ? (
                            <p className="p-3 text-sm text-muted-foreground">
                              Thiếu VITE_GOONG_MAP_KEY để hiển thị bản đồ.
                            </p>
                          ) : (
                            <>
                              <div ref={requestMapContainerRef} className="h-[320px] w-full" />
                              {!selectedCoordinates ? (
                                <p className="p-3 text-xs text-muted-foreground">
                                  Yêu cầu này chưa có tọa độ hợp lệ để ghim vị trí.
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-semibold">C. Khoảng cách & thời gian di chuyển</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Thời gian tạo
                        </p>
                        <p className="text-sm">{formatDate(selected.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Khoảng cách (km)
                        </p>
                        <p className="text-sm">{formatKm(selected.stationToRequestDistanceKm)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Thời gian di chuyển (phút)
                        </p>
                        <p className="text-sm">
                          {formatMin(selected.stationToRequestDurationMinutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Khoảng cách (m)
                        </p>
                        <p className="text-sm">
                          {formatMeters(selected.stationToRequestDistanceMeters)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Thời gian di chuyển (giây)
                        </p>
                        <p className="text-sm">
                          {formatSeconds(selected.stationToRequestDurationSeconds)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-sm font-semibold">D. Tệp đính kèm</p>
                  {selected.attachments?.length ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                          RequestEvidence (0) · Bằng chứng yêu cầu
                        </p>
                        {requestEvidenceAttachments.length ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {requestEvidenceAttachments.map((att) => (
                              <a
                                key={att.attachmentId}
                                href={att.fileUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg overflow-hidden border border-border bg-accent/30"
                                title={attachmentTypeLabel(att.attachmentType)}
                              >
                                <img
                                  src={att.fileUrl || ''}
                                  alt="attachment"
                                  className="w-full h-28 object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Không có bằng chứng yêu cầu.
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                          CompletionEvidence (1) · Bằng chứng hoàn thành
                        </p>
                        {completionEvidenceAttachments.length ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {completionEvidenceAttachments.map((att) => (
                              <a
                                key={att.attachmentId}
                                href={att.fileUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg overflow-hidden border border-border bg-accent/30"
                                title={attachmentTypeLabel(att.attachmentType)}
                              >
                                <img
                                  src={att.fileUrl || ''}
                                  alt="attachment"
                                  className="w-full h-28 object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Không có bằng chứng hoàn thành.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có ảnh đính kèm.</p>
                  )}
                </div>

                <div className="rounded-lg border border-border p-4 space-y-3">
                  <p className="text-sm font-semibold">E. Xác minh yêu cầu</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground mb-1">
                        Phương thức xác minh
                      </p>
                      <select
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        value={verifyMethod}
                        onChange={(e) => setVerifyMethod(Number(e.target.value))}
                      >
                        {[0, 1, 2, 3, 4, 5].map((m) => (
                          <option key={m} value={m}>
                            {verificationMethodLabel(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground mb-1">
                        Ghi chú xác minh
                      </p>
                      <Textarea
                        value={verifyNote}
                        onChange={(e) => setVerifyNote(e.target.value)}
                        placeholder="Ghi chú xác minh (không bắt buộc)"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={handleVerify}
                      disabled={!isPending || verifyStatus === 'pending'}
                    >
                      {verifyStatus === 'pending' ? 'Đang xác minh...' : 'Xác minh'}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => {
                        setActionError('');
                        setIsRejectOpen(true);
                      }}
                      disabled={!isPending || rejectStatus === 'pending'}
                    >
                      Từ chối
                    </Button>
                  </div>
                </div>

                {verification?.status === 2 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-xs uppercase font-semibold text-red-600">Lý do từ chối</p>
                    <p className="text-sm text-red-700 mt-1">
                      {verification.reason || 'Không có lý do'}
                    </p>
                  </div>
                )}

                {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu cứu hộ</DialogTitle>
            <DialogDescription>
              Chọn method và nhập lý do từ chối. Lý do là bắt buộc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Phương thức xác minh</label>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={rejectMethod}
                onChange={(e) => setRejectMethod(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    {verificationMethodLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Lý do từ chối *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Ghi chú thêm (không bắt buộc)"
                rows={2}
              />
            </div>
          </div>

          {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectOpen(false);
                setRejectReason('');
                setRejectNote('');
                setActionError('');
              }}
              disabled={rejectStatus === 'pending'}
            >
              Hủy
            </Button>
            <Button variant="primary" onClick={handleReject} disabled={rejectStatus === 'pending'}>
              {rejectStatus === 'pending' ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
