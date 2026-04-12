import { useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Map as GoongMap, type Marker } from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
const REQUEST_LIST_PAGE_SIZE = 5;

const buildPageItems = (currentPage: number, totalPages: number) => {
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
  const [listPage, setListPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

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

  const requestStats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => {
        const status = getVerification(r)?.status;
        return status === 0 || status === '0' || status === 'Pending' || status == null;
      }).length,
      approved: requests.filter((r) => {
        const status = getVerification(r)?.status;
        return status === 1 || status === '1' || status === 'Approved';
      }).length,
      rejected: requests.filter((r) => {
        const status = getVerification(r)?.status;
        return status === 2 || status === '2' || status === 'Rejected';
      }).length,
    }),
    [requests],
  );

  const totalListPages = Math.max(1, Math.ceil(filtered.length / REQUEST_LIST_PAGE_SIZE));

  useEffect(() => {
    setListPage(1);
  }, [search, verificationFilter]);

  useEffect(() => {
    if (listPage > totalListPages) {
      setListPage(totalListPages);
    }
  }, [listPage, totalListPages]);

  useEffect(() => {
    setPageInput(String(listPage));
  }, [listPage]);

  const paginatedRequests = useMemo(() => {
    const start = (listPage - 1) * REQUEST_LIST_PAGE_SIZE;
    return filtered.slice(start, start + REQUEST_LIST_PAGE_SIZE);
  }, [filtered, listPage]);

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

  const handleJumpToPage = () => {
    const nextPage = Number(pageInput);
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(listPage));
      return;
    }

    setListPage(Math.min(Math.max(1, Math.trunc(nextPage)), totalListPages));
  };

  const listPageItems = buildPageItems(listPage, totalListPages);

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-primary md:text-4xl">Quản lý yêu cầu cứu hộ</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Đồng bộ danh sách yêu cầu cần xử lý, theo dõi vị trí và xác minh theo đúng luồng điều
              phối của coordinator.
            </p>
          </div>
          <Button variant="outline" className="h-11 gap-2 px-5" onClick={() => refetch()}>
            <span className="material-symbols-outlined">refresh</span>
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Tổng yêu cầu
                  </p>
                  <p className="mt-3 text-3xl font-black text-foreground">{requestStats.total}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-500/10 text-sky-600">
                  <span className="material-symbols-outlined">inbox</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chờ xác minh
                  </p>
                  <p className="mt-3 text-3xl font-black text-amber-600">{requestStats.pending}</p>
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
                    Đã xác minh
                  </p>
                  <p className="mt-3 text-3xl font-black text-emerald-600">
                    {requestStats.approved}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-500/10 text-emerald-600">
                  <span className="material-symbols-outlined">verified</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Từ chối
                  </p>
                  <p className="mt-3 text-3xl font-black text-rose-600">{requestStats.rejected}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-500/10 text-rose-600">
                  <span className="material-symbols-outlined">cancel</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-border bg-card">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-b border-border/70 px-5 pb-4 pt-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground">Danh sách yêu cầu</h2>
                    <p className="text-xs text-muted-foreground">
                      Hiển thị 5 yêu cầu mỗi trang, có tìm kiếm, lọc và chuyển trang nhanh.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
                    <div className="relative">
                      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                        search
                      </span>
                      <Input
                        className="h-11 border-border bg-background pl-10"
                        placeholder="Tìm tên, SĐT, địa chỉ, mô tả..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <Select
                      value={verificationFilter}
                      onValueChange={(value: 'all' | 'pending' | 'approved' | 'rejected') =>
                        setVerificationFilter(value)
                      }
                    >
                      <SelectTrigger className="h-11 border-border bg-background">
                        <SelectValue placeholder="Lọc trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="pending">Chờ xác minh</SelectItem>
                        <SelectItem value="approved">Đã xác minh</SelectItem>
                        <SelectItem value="rejected">Từ chối</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={verificationFilter === 'all' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setVerificationFilter('all')}
                    >
                      <span className="material-symbols-outlined text-sm">apps</span>
                      Tất cả
                    </Button>
                    <Button
                      size="sm"
                      variant={verificationFilter === 'pending' ? 'primary' : 'outline'}
                      className={cn(
                        'rounded-full',
                        verificationFilter === 'pending' &&
                          'border-amber-300 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20',
                      )}
                      onClick={() => setVerificationFilter('pending')}
                    >
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Chờ xác minh
                    </Button>
                    <Button
                      size="sm"
                      variant={verificationFilter === 'approved' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setVerificationFilter('approved')}
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Đã xác minh
                    </Button>
                    <Button
                      size="sm"
                      variant={verificationFilter === 'rejected' ? 'primary' : 'outline'}
                      className="rounded-full"
                      onClick={() => setVerificationFilter('rejected')}
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      Từ chối
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto px-4 py-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((k) => (
                      <Skeleton key={k} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                ) : isError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-500/5 px-4 py-4 text-sm text-rose-600">
                    Không tải được danh sách yêu cầu.
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-muted-foreground">
                      search_off
                    </span>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Không có yêu cầu phù hợp
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Hãy thử thay đổi từ khóa tìm kiếm hoặc trạng thái cần lọc.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedRequests.map((req) => {
                      const id = getRequestId(req);
                      const verificationItem = getVerification(req);
                      const isActive = id === effectiveSelectedId;

                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedId(id)}
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
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {req.address || 'Chua cap nhat dia chi'}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                                verificationStatusClass(verificationItem?.status),
                              )}
                            >
                              {verificationStatusText(verificationItem?.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">cyclone</span>
                              {req.disasterType != null
                                ? getDisasterTypeLabel(req.disasterType)
                                : '--'}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">route</span>
                              {formatKm(req.stationToRequestDistanceKm)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              {formatMin(req.stationToRequestDurationMinutes)}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {formatDate(req.createdAt)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Trang {listPage}/{totalListPages} - Hiển thị {paginatedRequests.length} /{' '}
                    {filtered.length} yêu cầu lọc được.
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
                      Prev
                    </Button>
                    {listPageItems.map((item, index) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1 text-sm text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          size="sm"
                          variant={item === listPage ? 'primary' : 'outline'}
                          className="min-w-9"
                          onClick={() => setListPage(item)}
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
                      Next
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Button>
                    <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
                      <span className="text-xs text-muted-foreground">Tới trang</span>
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

          <Card className="rounded-2xl border-border bg-card">
            <CardContent className="p-4 md:p-6">
              {!selected ? (
                <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center text-muted-foreground">
                  Chon mot yeu cau de xem chi tiet.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-5">
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
                    <div className="overflow-hidden rounded-2xl border border-border p-4 space-y-3">
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

                    <div className="rounded-2xl border border-border p-4 space-y-3">
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
                          <div className="overflow-hidden rounded-2xl border border-border bg-accent/20">
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

                    <div className="rounded-2xl border border-border p-4 space-y-3">
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

                  <div className="overflow-hidden rounded-2xl border border-border p-4 space-y-3">
                    <p className="text-sm font-semibold">D. Tệp đính kèm</p>
                    {selected.attachments?.length ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground font-semibold mb-2">
                            RequestEvidence (0) · Bằng chứng yêu cầu
                          </p>
                          {requestEvidenceAttachments.length ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                              {requestEvidenceAttachments.map((att) => (
                                <a
                                  key={att.attachmentId}
                                  href={att.fileUrl || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="overflow-hidden rounded-2xl border border-border bg-accent/30"
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                              {completionEvidenceAttachments.map((att) => (
                                <a
                                  key={att.attachmentId}
                                  href={att.fileUrl || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="overflow-hidden rounded-2xl border border-border bg-accent/30"
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

                  <div className="rounded-2xl border border-border p-4 space-y-3">
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
