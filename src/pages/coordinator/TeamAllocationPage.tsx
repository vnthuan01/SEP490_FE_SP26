import { useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { ReliefLocation, Team } from './components/types';
import { HEADQUARTERS, reliefLocationsData, teamsData } from './components/mockData';
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

const GOONG_API_KEY = import.meta.env.VITE_GOONG_MAP_KEY || '';

export default function CoordinatorTeamAllocationPage() {
  const [teams, setTeams] = useState<Team[]>(teamsData);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [needsFilter, setNeedsFilter] = useState<string>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Calculate AI scores and distances on mount
  const reliefLocations = useMemo(() => {
    return reliefLocationsData.map((loc) => {
      const dangerScore = loc.dangerScore ?? calculateDangerScore(loc);
      const priorityScore = loc.priorityScore ?? calculatePriorityScore(loc, dangerScore);

      const straightLine = calculateStraightLineDistance(
        HEADQUARTERS.coordinates.lat,
        HEADQUARTERS.coordinates.lng,
        loc.coordinates.lat,
        loc.coordinates.lng,
      );

      return {
        ...loc,
        dangerScore,
        priorityScore,
        distanceFromHQ: {
          straightLine,
          byMotorcycle: estimateTravelTime(straightLine, 'motorcycle'),
          byTruck: estimateTravelTime(straightLine, 'truck'),
          byHelicopter: estimateTravelTime(straightLine, 'helicopter'),
        },
      };
    });
  }, []);

  // Filtered locations
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
          false
        );
      }
      return true;
    });
  }, [reliefLocations, urgencyFilter, statusFilter, needsFilter, search]);

  // Available teams
  const availableTeams = useMemo(() => {
    return teams.filter((t) => t.status === 'available');
  }, [teams]);

  // Stats
  const stats = useMemo(
    () => ({
      total: reliefLocations.length,
      highUrgency: reliefLocations.filter((l) => l.urgency === 'high').length,
      unassigned: reliefLocations.filter((l) => l.status === 'unassigned').length,
      completed: reliefLocations.filter((l) => l.status === 'completed').length,
    }),
    [reliefLocations],
  );

  // Handle team assignment
  const handleAssignTeam = useCallback(
    (locationId: string, teamId: string) => {
      const location = reliefLocations.find((l) => l.id === locationId);
      const team = teams.find((t) => t.id === teamId);

      if (!location || !team) return;

      if (location.status !== 'unassigned') {
        toast.error('Địa điểm này đã được phân công');
        return;
      }

      if (team.status !== 'available') {
        toast.error('Đội này đang bận');
        return;
      }

      // setReliefLocations((prev) =>
      //   prev.map((loc) =>
      //     loc.id === locationId ? { ...loc, status: 'assigned', assignedTeamId: teamId } : loc
      //   )
      // );

      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, status: 'moving', currentAssignment: locationId } : t,
        ),
      );

      toast.success(`Đã phân công ${team.name} đến ${location.locationName}`);
    },
    [reliefLocations, teams],
  );

  // Handle location click
  const handleLocationClick = useCallback((location: ReliefLocation) => {
    setSelectedLocationId(location.id);
  }, []);

  // Handle fit bounds
  const handleFitBounds = useCallback(() => {
    if ((window as any).reliefMapFitBounds) {
      (window as any).reliefMapFitBounds();
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

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

  // Fullscreen mode
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
            headquarters={HEADQUARTERS}
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
                  <span className="material-symbols-outlined text-[20px]">
                    {showSidebar ? 'close' : 'list'}
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
                  ${showSidebar ? 'bg-rose-600' : 'bg-emerald-600'}
              `}
              >
                <span className="material-symbols-outlined text-[14px] text-blue-500">
                  {showSidebar ? 'visibility_off' : 'visibility'}
                </span>
                {showSidebar ? 'Ẩn danh sách' : 'Hiện danh sách'}
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

  // Normal mode with sidebar
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
              headquarters={HEADQUARTERS}
              onLocationSelect={handleLocationClick}
              selectedLocationId={selectedLocationId}
              apiKey={GOONG_API_KEY}
            />
          </div>

          {/* Sidebar */}
          <aside className="w-[380px] flex flex-col border-l bg-muted/20">
            <LocationList
              locations={filteredLocations}
              onLocationClick={handleLocationClick}
              selectedLocationId={selectedLocationId}
            />
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
