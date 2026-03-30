import { useEffect, useMemo, useRef, useState } from 'react';
import goongjs, { type Marker } from '@goongmaps/goong-js';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useRescueRequests } from '@/hooks/useRescueRequests';
import { useTeamsInStation } from '@/hooks/useTeams';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { rescueRequestService } from '@/services/rescueRequestService';
import { useGoongMap } from '@/hooks/useGoongMap';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';

const isVerifiedRequest = (status?: string | number | null) => {
  if (typeof status === 'string') return status.trim().toLowerCase() === 'verified';
  if (typeof status === 'number') return status === 1;
  return false;
};

const rescueTypeText = (value: unknown) => {
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'normal') return 'Cứu hộ bình thường';
    if (v === 'emergency') return 'Cứu hộ khẩn cấp';
    return value;
  }
  if (typeof value === 'number') {
    if (value === 0) return 'Cứu hộ bình thường';
    if (value === 1) return 'Cứu hộ khẩn cấp';
  }
  return 'Không rõ';
};

const rescueTypeKey = (value: unknown): 'normal' | 'emergency' | 'unknown' => {
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'normal') return 'normal';
    if (v === 'emergency') return 'emergency';
  }
  if (typeof value === 'number') {
    if (value === 0) return 'normal';
    if (value === 1) return 'emergency';
  }
  return 'unknown';
};

const formatDateTime = (value: unknown) => {
  if (!value) return 'Chưa rõ thời gian';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDistance = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} km`;
  if (n > 0) return `${Math.round(n)} m`;
  return null;
};

const formatTravelTime = (value: unknown) => {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber)) return raw;
  if (asNumber < 60) return `${Math.round(asNumber)} phút`;
  const hours = Math.floor(asNumber / 60);
  const minutes = Math.round(asNumber % 60);
  if (minutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
};

const getRequestId = (req: any) => String(req.requestId ?? req.rescueRequestId ?? req.id ?? '');
const GOONG_API_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';

export default function RescueDispatchPage() {
  const { station } = useMyReliefStation();
  const { requests, isLoading, isError, refetch } = useRescueRequests({
    pageNumber: 1,
    pageSize: 100,
    statusFilter: 1,
  });
  const { teams } = useTeamsInStation(station?.reliefStationId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [note, setNote] = useState('');
  const [singleLoadingId, setSingleLoadingId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedId, setFocusedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'emergency'>('all');

  const mapCenter = useMemo(
    () => ({
      lat: Number(station?.latitude) || 16.0544,
      lng: Number(station?.longitude) || 108.2022,
    }),
    [station?.latitude, station?.longitude],
  );

  const {
    map,
    mapRef,
    isLoading: isMapLoading,
    error: mapError,
  } = useGoongMap({
    center: mapCenter,
    zoom: 9,
    apiKey: GOONG_API_KEY,
  });
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const stationMarkerRef = useRef<Marker | null>(null);

  const verifiedRequests = useMemo(
    () => requests.filter((r: any) => isVerifiedRequest(r.rescueRequestStatus)),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return verifiedRequests.filter((r: any) => {
      const type = rescueTypeKey(r.rescueRequestType);
      if (typeFilter !== 'all' && type !== typeFilter) return false;
      if (!query) return true;

      const values = [r.disasterType, r.description, r.reporterFullName, r.reporterPhone, r.address]
        .filter(Boolean)
        .map((v: any) => String(v).toLowerCase());

      return values.some((text: string) => text.includes(query));
    });
  }, [verifiedRequests, searchQuery, typeFilter]);

  const availableTeams = useMemo(
    () => teams.filter((team: any) => String(team.status ?? '').toLowerCase() === 'available'),
    [teams],
  );

  const validCoordinateCount = useMemo(
    () =>
      verifiedRequests.filter((r: any) => {
        const lat = Number(r.latitude);
        const lng = Number(r.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng);
      }).length,
    [verifiedRequests],
  );

  const emergencyCount = useMemo(
    () =>
      verifiedRequests.filter((r: any) => rescueTypeKey(r.rescueRequestType) === 'emergency')
        .length,
    [verifiedRequests],
  );

  const normalCount = useMemo(
    () =>
      verifiedRequests.filter((r: any) => rescueTypeKey(r.rescueRequestType) === 'normal').length,
    [verifiedRequests],
  );

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => verifiedRequests.some((r: any) => getRequestId(r) === id)),
    );
  }, [verifiedRequests]);

  useEffect(() => {
    if (!filteredRequests.length) {
      setFocusedId('');
      return;
    }
    const exists = filteredRequests.some((r: any) => getRequestId(r) === focusedId);
    if (!focusedId || !exists) {
      setFocusedId(getRequestId(filteredRequests[0]));
    }
  }, [filteredRequests, focusedId]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    filteredRequests.forEach((r: any) => {
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const id = getRequestId(r);
      const marker = new goongjs.Marker({
        color: id === focusedId ? '#ef4444' : '#2563eb',
        scale: id === focusedId ? 1.2 : 1,
      })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.getElement().style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => setFocusedId(id));
      markersRef.current.set(id, marker);
    });
  }, [map, filteredRequests, focusedId]);

  useEffect(() => {
    if (!map) return;

    if (stationMarkerRef.current) {
      stationMarkerRef.current.remove();
      stationMarkerRef.current = null;
    }

    if (Number.isFinite(mapCenter.lat) && Number.isFinite(mapCenter.lng)) {
      stationMarkerRef.current = new goongjs.Marker({ color: '#7c3aed', scale: 1.15 })
        .setLngLat([mapCenter.lng, mapCenter.lat])
        .addTo(map);
    }
  }, [map, mapCenter.lat, mapCenter.lng]);

  useEffect(() => {
    const currentMarkers = markersRef.current;
    const currentStationMarkerRef = stationMarkerRef;
    return () => {
      currentMarkers.forEach((m) => m.remove());
      currentMarkers.clear();
      currentStationMarkerRef.current?.remove();
      currentStationMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map || !focusedId) return;
    const focused = filteredRequests.find((r: any) => getRequestId(r) === focusedId);
    if (!focused) return;
    const lat = Number(focused.latitude);
    const lng = Number(focused.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    (map as any).flyTo({ center: [lng, lat], zoom: 13, speed: 1.1 });
  }, [map, focusedId, filteredRequests]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAssignSingle = async (requestId: string) => {
    if (!selectedTeamId) {
      setError('Vui lòng chọn team trước khi gán.');
      return;
    }
    setError('');
    setSingleLoadingId(requestId);
    try {
      await rescueRequestService.assignTeam(requestId, {
        teamId: selectedTeamId,
        note: note.trim() || undefined,
      });
      window.alert('Đã gán team cho request.');
      await refetch();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không thể gán team cho request.');
    } finally {
      setSingleLoadingId('');
    }
  };

  const handleAssignBulk = async () => {
    if (!selectedTeamId) {
      setError('Vui lòng chọn team trước khi gán hàng loạt.');
      return;
    }
    if (!selectedIds.length) {
      setError('Vui lòng chọn ít nhất 1 request.');
      return;
    }
    setError('');
    setBulkLoading(true);
    try {
      await rescueRequestService.assignTeamBulk({
        teamId: selectedTeamId,
        requestIds: selectedIds,
        note: note.trim() || undefined,
      });
      setSelectedIds([]);
      window.alert('Đã gán team cho nhiều request.');
      await refetch();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không thể gán hàng loạt.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleFitAllMarkers = () => {
    if (!map) return;
    const bounds = new goongjs.LngLatBounds();
    let hasPoint = false;

    filteredRequests.forEach((r: any) => {
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      bounds.extend([lng, lat]);
      hasPoint = true;
    });

    if (Number.isFinite(mapCenter.lat) && Number.isFinite(mapCenter.lng)) {
      bounds.extend([mapCenter.lng, mapCenter.lat]);
      hasPoint = true;
    }

    if (!hasPoint) return;
    (map as any).fitBounds(bounds, { padding: 90, duration: 900, maxZoom: 13 });
  };

  const handleFocusStation = () => {
    if (!map) return;
    (map as any).flyTo({ center: [mapCenter.lng, mapCenter.lat], zoom: 12, speed: 1.1 });
  };

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary">Điều phối cứu hộ</h1>
          <p className="text-muted-foreground mt-1">
            Chỉ hiển thị yêu cầu có trạng thái <b>Đã xác minh</b> để gán đội.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <span className="material-symbols-outlined">refresh</span>Tải lại
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card className="border-blue-200/70 bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-widest text-blue-700/80 mb-1">
              Đã xác minh
            </p>
            <p className="text-3xl font-black text-blue-900">{verifiedRequests.length}</p>
            <p className="text-xs text-blue-700/80 mt-1">Tổng request đã xác minh</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-100/50">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-widest text-amber-700/80 mb-1">
              Đang chọn
            </p>
            <p className="text-3xl font-black text-amber-900">{selectedIds.length}</p>
            <p className="text-xs text-amber-700/80 mt-1">Đã chọn để gán</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-green-100/50">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-widest text-emerald-700/80 mb-1">
              Nhân lực
            </p>
            <p className="text-3xl font-black text-emerald-900">{availableTeams.length}</p>
            <p className="text-xs text-emerald-700/80 mt-1">Team sẵn sàng</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200/70 bg-gradient-to-br from-violet-50 to-indigo-100/50">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-widest text-violet-700/80 mb-1">Bản đồ</p>
            <p className="text-3xl font-black text-violet-900">{validCoordinateCount}</p>
            <p className="text-xs text-violet-700/80 mt-1">Request có tọa độ hợp lệ</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-border/80 shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Chọn team điều phối
            </p>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">-- Chọn team --</option>
              {teams.map((t: any) => (
                <option key={String(t.teamId ?? t.id)} value={String(t.teamId ?? t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Chọn team trước khi gán đơn lẻ hoặc gán hàng loạt.
            </p>
          </div>

          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Ghi chú điều phối
            </p>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: ưu tiên tiếp cận từ hướng quốc lộ, mang thêm y tế..."
            />
          </div>

          <div className="lg:col-span-3 flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={handleAssignBulk}
              disabled={bulkLoading || !selectedTeamId || !selectedIds.length}
              className="w-full"
            >
              {bulkLoading ? 'Đang gán...' : `Gán hàng loạt (${selectedIds.length})`}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gán nhanh cho các request đã chọn. Hệ thống giữ nguyên logic API hiện tại.
            </p>
          </div>

          {error ? <p className="text-sm text-red-500 lg:col-span-12">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[410px_minmax(0,1fr)] gap-4">
        <aside className="space-y-3">
          <Card className="overflow-hidden">
            <CardContent className="p-4 border-b border-border/60 bg-muted/20">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                  search
                </span>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  placeholder="Tìm theo người báo tin, địa chỉ, loại thiên tai..."
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { key: 'all', label: `Tất cả (${verifiedRequests.length})` },
                  { key: 'emergency', label: `Khẩn cấp (${emergencyCount})` },
                  { key: 'normal', label: `Bình thường (${normalCount})` },
                ].map((chip) => {
                  const active = typeFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setTypeFilter(chip.key as 'all' | 'normal' | 'emergency')}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-background hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Hiển thị <b>{filteredRequests.length}</b> request phù hợp bộ lọc.
              </p>
            </CardContent>

            <CardContent className="p-3 max-h-[62vh] overflow-auto space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((k) => (
                    <div
                      key={k}
                      className="h-32 rounded-xl border border-border bg-accent/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : isError ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center px-4">
                  <span className="material-symbols-outlined text-4xl text-red-500">error</span>
                  <p className="mt-2 font-semibold">Không tải được danh sách yêu cầu</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vui lòng thử tải lại sau vài giây.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                    Tải lại dữ liệu
                  </Button>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center px-4">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground">
                    inbox
                  </span>
                  <p className="mt-2 font-semibold">Không có request phù hợp</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Thử thay đổi từ khóa hoặc bộ lọc để xem thêm kết quả.
                  </p>
                </div>
              ) : (
                filteredRequests.map((r: any) => {
                  const id = getRequestId(r);
                  const selected = selectedIds.includes(id);
                  const focused = focusedId === id;
                  const distanceText =
                    formatDistance(r.distance) ||
                    formatDistance(r.distanceInMeters) ||
                    formatDistance(r.kmDistance);
                  const travelTimeText =
                    formatTravelTime(r.estimatedTime) ||
                    formatTravelTime(r.eta) ||
                    formatTravelTime(r.travelTimeInMinutes);
                  const requestType = rescueTypeKey(r.rescueRequestType);

                  return (
                    <article
                      key={id}
                      onClick={() => setFocusedId(id)}
                      className={`rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                        focused
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30'
                          : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full border font-semibold bg-blue-500/10 text-blue-700 border-blue-500/20">
                          Đã xác minh
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                            requestType === 'emergency'
                              ? 'bg-red-500/10 text-red-700 border-red-500/30'
                              : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                          }`}
                        >
                          {rescueTypeText(r.rescueRequestType)}
                        </span>
                      </div>

                      <p className="text-sm font-bold leading-snug">
                        {r.disasterType || 'Chưa rõ loại thiên tai'}
                      </p>

                      <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <p className="truncate">
                          <span className="font-medium text-foreground">Người báo:</span>{' '}
                          {r.reporterFullName || '--'}
                          {r.reporterPhone ? ` • ${r.reporterPhone}` : ''}
                        </p>
                        <p className="truncate">
                          <span className="font-medium text-foreground">Địa chỉ:</span>{' '}
                          {r.address || 'Chưa cập nhật'}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Tạo lúc:</span>{' '}
                          {formatDateTime(r.createdAt)}
                        </p>
                        {(distanceText || travelTimeText) && (
                          <p>
                            <span className="font-medium text-foreground">Di chuyển:</span>{' '}
                            {distanceText || '--'}
                            {travelTimeText ? ` • ${travelTimeText}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                        <label
                          className="inline-flex items-center gap-2 text-xs font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(id)}
                            className="rounded"
                          />
                          Chọn gán nhanh
                        </label>
                        <Button
                          size="sm"
                          variant={focused ? 'primary' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignSingle(id);
                          }}
                          disabled={singleLoadingId === id || !selectedTeamId}
                        >
                          {singleLoadingId === id ? 'Đang gán...' : 'Gán team'}
                        </Button>
                      </div>
                    </article>
                  );
                })
              )}
            </CardContent>
          </Card>
        </aside>

        <section>
          <Card className="overflow-hidden">
            <CardContent className="p-0 relative overflow-hidden rounded-xl">
              {!GOONG_API_KEY ? (
                <div className="h-[72vh] flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-gradient-to-br from-muted/40 to-background">
                  <span className="material-symbols-outlined text-5xl mb-3">vpn_key_off</span>
                  <p className="font-semibold text-foreground">Thiếu VITE_GOONG_MAP_KEY</p>
                  <p className="text-sm mt-1">Chưa thể hiển thị bản đồ điều phối.</p>
                </div>
              ) : mapError ? (
                <div className="h-[72vh] flex flex-col items-center justify-center text-center p-6 bg-red-50/50">
                  <span className="material-symbols-outlined text-5xl text-red-500 mb-3">map</span>
                  <p className="font-semibold text-red-700">Bản đồ gặp sự cố</p>
                  <p className="text-sm text-red-600/90 mt-1">{mapError}</p>
                </div>
              ) : (
                <>
                  <div ref={mapRef} className="h-[72vh] w-full" />

                  <div className="absolute top-3 left-3 z-10 rounded-xl border border-border/70 bg-background/95 backdrop-blur p-2.5 shadow-lg">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                      Điều khiển nhanh
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleFitAllMarkers}
                        disabled={!filteredRequests.length}
                      >
                        <span className="material-symbols-outlined text-[16px]">fit_screen</span>
                        Fit tất cả marker
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleFocusStation}>
                        <span className="material-symbols-outlined text-[16px]">home_pin</span>
                        Focus trạm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => refetch()}>
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Làm mới request
                      </Button>
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-3 z-10 rounded-xl border border-border/70 bg-background/95 backdrop-blur p-3 shadow-lg min-w-[210px]">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                      Chú giải marker
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-blue-600" />
                        <span>Request đã xác minh</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-red-500" />
                        <span>Request đang focus</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-violet-600" />
                        <span>Trạm cứu trợ</span>
                      </div>
                    </div>
                  </div>

                  {isMapLoading && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-4xl animate-pulse">
                          explore
                        </span>
                        <p className="mt-2 text-sm font-medium">Đang tải bản đồ điều phối...</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
