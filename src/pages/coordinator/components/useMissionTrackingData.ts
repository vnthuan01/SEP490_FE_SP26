import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  rescueRequestService,
  type RescueOperationDetail,
  type RescueRequestDetail,
  type TeamLocationDto,
} from '@/services/rescueRequestService';
import { teamService, type TeamTrackingPoint } from '@/services/teamService';

interface UseMissionTrackingDataParams {
  selectedId: string;
  selectedListRequest: RescueRequestDetail | null;
  enabled: boolean;
}

interface UseMissionTrackingDataResult {
  detail: RescueRequestDetail | null;
  isDetailLoading: boolean;
  currentOperation: RescueOperationDetail | null;
  teamLocation: TeamLocationDto | null;
  trackingPoints: TeamTrackingPoint[];
  refetchDetail: () => void;
}

export function useMissionTrackingData({
  selectedId,
  selectedListRequest,
  enabled,
}: UseMissionTrackingDataParams): UseMissionTrackingDataResult {
  const [detail, setDetail] = useState<RescueRequestDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [teamLocation, setTeamLocation] = useState<TeamLocationDto | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<TeamTrackingPoint[]>([]);

  // Stable refs so interval callbacks always access latest values without restarting
  const selectedIdRef = useRef(selectedId);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Derived: most recent operation from fetched detail
  const currentOperation = useMemo<RescueOperationDetail | null>(() => {
    if (!detail?.rescueOperations?.length) return null;
    const ops = [...(detail.rescueOperations ?? [])] as RescueOperationDetail[];
    ops.sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime());
    return ops[0];
  }, [detail]);

  // Effective status: from fetched detail first; fall back to list item for instant responsiveness
  const effectiveOpStatus = useMemo(() => {
    if (currentOperation?.status) return currentOperation.status;
    const ops = selectedListRequest?.rescueOperations as RescueOperationDetail[] | undefined;
    if (!ops?.length) return null;
    const latest = [...ops].sort(
      (a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime(),
    )[0];
    return latest?.status ?? null;
  }, [currentOperation, selectedListRequest]);

  const isEnRoute = effectiveOpStatus === 'EnRoute';
  const isPostMission = effectiveOpStatus === 'Rescuing' || effectiveOpStatus === 'RescueCompleted';

  // ── Fetch detail ────────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const data = await rescueRequestService.getById(id);
      setDetail(data);
    } catch {
      toast.error('Không tải được chi tiết yêu cầu.');
    }
  }, []);

  /** Expose for external callers (e.g. after ETA recalculate) */
  const refetchDetail = useCallback(() => {
    const id = selectedIdRef.current;
    if (id) void fetchDetail(id);
  }, [fetchDetail]);

  // ── On selectedId change: reset, initial fetch, periodic refresh ─────────
  useEffect(() => {
    if (!selectedId || !enabled) {
      setDetail(null);
      setTeamLocation(null);
      setTrackingPoints([]);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
      return;
    }

    // Only reset teamLocation on mission selection change (not on detail refresh)
    setTeamLocation(null);
    setIsDetailLoading(true);

    void fetchDetail(selectedId).finally(() => setIsDetailLoading(false));

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, enabled]);

  // ── Location polling: only while EnRoute ────────────────────────────────
  useEffect(() => {
    if (!isEnRoute || !selectedId || !enabled) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const id = selectedIdRef.current;
        if (!id) return;
        const loc = await rescueRequestService.getTeamLocation(id);
        // IMPORTANT: do NOT clear teamLocation here; only update it
        setTeamLocation(loc);
        // If status changed away from EnRoute, stop polling and refresh detail
        if (loc.operationStatus !== 'EnRoute') {
          if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
            locationIntervalRef.current = null;
          }
          void fetchDetail(id);
        }
      } catch {
        // silently ignore transient errors
      }
    };

    // Immediate first poll
    void poll();

    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    locationIntervalRef.current = setInterval(poll, 8_000);

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [isEnRoute, selectedId, enabled, fetchDetail]);

  // ── Tracking points: fetch when team/op context is available ──────────────
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
      .catch(() => void 0);
  }, [
    detail?.assignedRescueTeam?.teamId,
    isEnRoute,
    isPostMission,
    currentOperation?.rescueOperationId,
  ]);

  return {
    detail,
    isDetailLoading,
    currentOperation,
    teamLocation,
    trackingPoints,
    refetchDetail,
  };
}
