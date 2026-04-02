import { useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { ReliefLocation, Team, Headquarters } from './components/types';
import {
  calculateDangerScore,
  calculatePriorityScore,
  calculateStraightLineDistance,
  estimateTravelTime,
} from './components/utils';
import { FilterBar } from './components/FilterBar';
import { LocationList } from './components/LocationList';
import { ReliefMap } from './components/ReliefMap';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LocationDetailSheet } from './components/LocationDetailSheet';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';
import { Skeleton } from '@/components/ui/skeleton';

// ── API hooks ──
import { useRescueRequests } from '@/hooks/useRescueRequests';
import { useTeamsInStation } from '@/hooks/useTeams';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { rescueRequestService } from '@/services/rescueRequestService';
import type { RescueRequestItem } from '@/services/rescueRequestService';
import {
  RescueRequestType,
  rescueStatusToLocationStatus,
  teamStatusToAvailability,
} from '@/enums/beEnums';

const GOONG_API_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';

// ─── Adapters: convert API data → existing UI types ─────────────────────────

/** Map a BE rescue‑request status to the UI status the components understand. */
function mapRequestStatus(req: RescueRequestItem): ReliefLocation['status'] {
  return rescueStatusToLocationStatus(req.rescueRequestStatus);
}

/** Map rescue‑request type → urgency level for the UI. */
function mapUrgency(req: RescueRequestItem): ReliefLocation['urgency'] {
  const t = req.rescueRequestType;
  // Emergency (1) = high urgency
  if (t === RescueRequestType.Emergency || t === 'Emergency') return 'high';
  // Use priority score from BE if available
  const p = req.priority ?? 0;
  if (p >= 70) return 'high';
  if (p >= 40) return 'medium';
  return 'medium';
}

/** Convert a single RescueRequestItem to ReliefLocation for the existing UI. */
function toReliefLocation(req: RescueRequestItem, hq: Headquarters): ReliefLocation {
  const lat = Number(req.latitude) || 0;
  const lng = Number(req.longitude) || 0;
  const urgency = mapUrgency(req);
  const status = mapRequestStatus(req);

  const base: ReliefLocation = {
    id: String(req.requestId ?? req.rescueRequestId ?? req.id ?? ''),
    coordinates: { lat, lng },
    locationName: req.address || req.disasterType || 'Yêu cầu cứu hộ',
    address: req.address || 'Chưa cập nhật',
    province: '', // BE doesn't return province separately
    urgency,
    peopleCount: req.priority ?? 0,
    needs: {
      food: false,
      water: false,
      medicine: false,
      emergencyRescue: urgency === 'high',
    },
    status,
    lastUpdated: req.updatedAt ? new Date(req.updatedAt).toLocaleString('vi-VN') : 'Chưa cập nhật',
    reportedAt: req.createdAt || new Date().toISOString(),
    description: req.description || undefined,
    contactPerson: req.reporterFullName || undefined,
    contactPhone: req.reporterPhone || undefined,
  };

  // Calculate AI scores using existing utils
  const dangerScore = calculateDangerScore(base);
  const priorityScore = calculatePriorityScore(base, dangerScore);

  // Distance from HQ
  const straightLine = calculateStraightLineDistance(
    hq.coordinates.lat,
    hq.coordinates.lng,
    lat,
    lng,
  );

  return {
    ...base,
    dangerScore,
    priorityScore,
    distanceFromHQ: {
      straightLine,
      byMotorcycle: estimateTravelTime(straightLine, 'motorcycle'),
      byTruck: estimateTravelTime(straightLine, 'truck'),
      byHelicopter: estimateTravelTime(straightLine, 'helicopter'),
    },
  };
}

/** Convert a team from the API to the UI Team type. */
function toTeam(apiTeam: any): Team {
  // TeamStatus: Draft=0, Active=1, Inactive=2, Suspended=3, Archived=4
  // Only Active(1) = 'available', all others = not available for dispatch
  const uiStatus = teamStatusToAvailability(apiTeam.status);

  return {
    id: String(apiTeam.teamId ?? apiTeam.id ?? ''),
    name: apiTeam.name || 'Không tên',
    currentLocation: { lat: 0, lng: 0 },
    vehicle: 'truck',
    capacity: { people: Number(apiTeam.totalMembers ?? apiTeam.members ?? 0), cargo: 0 },
    hasMedical: false,
    members: Number(apiTeam.totalMembers ?? apiTeam.members ?? 0),
    leader: apiTeam.leaderName ?? apiTeam.leader ?? '',
    contactPhone: apiTeam.contactPhone ?? '',
    status: uiStatus,
    area: apiTeam.area ?? '',
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CoordinatorTeamAllocationPage() {
  // ── API data ──
  const { station } = useMyReliefStation();
  const {
    requests,
    isLoading: isLoadingRequests,
    refetch,
  } = useRescueRequests({
    pageNumber: 1,
    pageSize: 200,
    statusFilter: 1, // Verified
  });
  const { teams: apiTeams } = useTeamsInStation(station?.reliefStationId);

  // ── build headquarters from station ──
  const headquarters: Headquarters = useMemo(
    () => ({
      name: station?.name || 'Trạm cứu trợ',
      coordinates: {
        lat: Number(station?.latitude) || 16.0544,
        lng: Number(station?.longitude) || 108.2022,
      },
      address: station?.address || '',
    }),
    [station],
  );

  // ── convert API teams → UI Team type ──
  const teams: Team[] = useMemo(() => (apiTeams || []).map(toTeam), [apiTeams]);

  // ── convert API requests → ReliefLocation[] with scores ──
  const reliefLocations: ReliefLocation[] = useMemo(
    () =>
      (requests || [])
        .filter((r: any) => {
          const lat = Number(r.latitude);
          const lng = Number(r.longitude);
          return Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0;
        })
        .map((r: any) => toReliefLocation(r, headquarters)),
    [requests, headquarters],
  );

  // ── filter state (same as old UI) ──
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [needsFilter, setNeedsFilter] = useState<string>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // ── filtered locations ──
  const filteredLocations = useMemo(() => {
    return reliefLocations.filter((loc) => {
      if (urgencyFilter !== 'all' && loc.urgency !== urgencyFilter) return false;
      if (statusFilter !== 'all' && loc.status !== statusFilter) return false;
      if (needsFilter !== 'all' && !loc.needs[needsFilter as keyof typeof loc.needs]) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          loc.locationName.toLowerCase().includes(query) ||
          loc.address.toLowerCase().includes(query) ||
          loc.province.toLowerCase().includes(query) ||
          loc.description?.toLowerCase().includes(query) ||
          loc.contactPerson?.toLowerCase().includes(query) ||
          loc.contactPhone?.toLowerCase().includes(query) ||
          false
        );
      }
      return true;
    });
  }, [reliefLocations, urgencyFilter, statusFilter, needsFilter, search]);

  // ── available teams ──
  const availableTeams = useMemo(() => teams.filter((t) => t.status === 'available'), [teams]);

  // ── stats ──
  const stats = useMemo(
    () => ({
      total: reliefLocations.length,
      highUrgency: reliefLocations.filter((l) => l.urgency === 'high').length,
      unassigned: reliefLocations.filter((l) => l.status === 'unassigned').length,
      completed: reliefLocations.filter((l) => l.status === 'completed').length,
    }),
    [reliefLocations],
  );

  // ── assign team → real API call ──
  const handleAssignTeam = useCallback(
    async (locationId: string, teamId: string) => {
      const location = reliefLocations.find((l) => l.id === locationId);
      const team = teams.find((t) => t.id === teamId);
      if (!location || !team) return;

      try {
        await rescueRequestService.assignTeam(locationId, { teamId });
        toast.success(`Đã phân công ${team.name} đến ${location.locationName}`);
        await refetch();
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Không thể phân công đội cứu trợ.');
      }
    },
    [reliefLocations, teams, refetch],
  );

  // ── location click ──
  const handleLocationClick = useCallback((location: ReliefLocation) => {
    setSelectedLocationId(location.id);
  }, []);

  // ── fit bounds ──
  const handleFitBounds = useCallback(() => {
    if ((window as any).reliefMapFitBounds) {
      (window as any).reliefMapFitBounds();
    }
  }, []);

  // ── fullscreen ──
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // ── loading state ──
  if (!GOONG_API_KEY) {
    return (
      <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="p-6">
            <CardContent className="text-center space-y-4">
              <span className="material-symbols-outlined text-5xl text-muted-foreground">
                error
              </span>
              <h2 className="text-xl font-bold">Thiếu API Key</h2>
              <p className="text-muted-foreground">
                Vui lòng cấu hình VITE_GOONG_MAP_KEY trong file .env
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── Fullscreen mode (same layout as original) ──
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          urgencyFilter={urgencyFilter}
          onUrgencyFilterChange={setUrgencyFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          needsFilter={needsFilter}
          onNeedsFilterChange={setNeedsFilter}
          onFitBounds={handleFitBounds}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          stats={stats}
        />
        <div className="flex-1 relative overflow-hidden">
          <ReliefMap
            locations={filteredLocations}
            headquarters={headquarters}
            onLocationSelect={handleLocationClick}
            selectedLocationId={selectedLocationId}
            apiKey={GOONG_API_KEY}
          />

          <LocationDetailSheet
            location={reliefLocations.find((l) => l.id === selectedLocationId) || null}
            isOpen={!!selectedLocationId}
            onClose={() => setSelectedLocationId(undefined)}
            availableTeams={availableTeams}
            onAssignTeam={handleAssignTeam}
          />

          {/* Toggle sidebar button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="
                    absolute top-4 right-4 z-20
                    bg-white text-slate-700
                    p-2
                    flex items-center justify-center
                    rounded-lg
                    border border-slate-200
                    shadow-md
                    hover:bg-slate-50
                    hover:shadow-lg
                    transition-all
                  "
                  aria-label={showSidebar ? 'Ẩn danh sách' : 'Hiện danh sách'}
                >
                  <span className=" material-symbols-outlined text-[20px]">
                    {showSidebar ? 'close' : 'view_list'}
                  </span>
                </button>
              </TooltipTrigger>

              <TooltipContent
                side="left"
                className={`
                  text-xs
                  px-3 py-1.5
                  rounded-md
                  shadow-lg
                  text-white
                  flex items-center gap-1
                  ${showSidebar ? 'bg-destructive' : 'bg-primary'}
              `}
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">
                  {showSidebar ? 'visibility_off' : 'visibility'}
                </span>
                {showSidebar ? 'Ẩn danh sách' : 'Hiển thị danh sách'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Sliding sidebar panel */}
          <div
            className={`absolute top-0 right-0 h-full w-[400px] bg-background border-l shadow-2xl transform transition-transform duration-300 ease-in-out z-10 ${
              showSidebar ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <h2 className="font-bold text-lg">Danh sách điểm cứu trợ</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <LocationList
                locations={filteredLocations}
                onLocationClick={handleLocationClick}
                selectedLocationId={selectedLocationId}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal mode with sidebar (same layout as original) ──
  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          urgencyFilter={urgencyFilter}
          onUrgencyFilterChange={setUrgencyFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          needsFilter={needsFilter}
          onNeedsFilterChange={setNeedsFilter}
          onFitBounds={handleFitBounds}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          stats={stats}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            <ReliefMap
              locations={filteredLocations}
              headquarters={headquarters}
              onLocationSelect={handleLocationClick}
              selectedLocationId={selectedLocationId}
              apiKey={GOONG_API_KEY}
            />
          </div>

          {/* Sidebar */}
          <aside className="w-[380px] flex flex-col border-l bg-muted/20">
            {isLoadingRequests ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((k) => (
                  <Skeleton key={k} className="h-12" />
                ))}
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                <span className="material-symbols-outlined text-4xl text-muted-foreground">
                  {reliefLocations.length === 0 ? 'where_to_vote' : 'search_off'}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {reliefLocations.length === 0
                    ? 'Chưa có yêu cầu đã xác minh'
                    : 'Không có kết quả phù hợp'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reliefLocations.length === 0
                    ? 'Bản đồ vẫn hiển thị trụ sở trạm. Dữ liệu sẽ xuất hiện khi có yêu cầu được duyệt.'
                    : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
                </p>
              </div>
            ) : (
              <LocationList
                locations={filteredLocations}
                onLocationClick={handleLocationClick}
                selectedLocationId={selectedLocationId}
              />
            )}
          </aside>
        </div>
      </div>
      <LocationDetailSheet
        location={reliefLocations.find((l) => l.id === selectedLocationId) || null}
        isOpen={!!selectedLocationId}
        onClose={() => setSelectedLocationId(undefined)}
        availableTeams={availableTeams}
        onAssignTeam={handleAssignTeam}
      />
    </DashboardLayout>
  );
}
