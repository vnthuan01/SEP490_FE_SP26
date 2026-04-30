import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReliefLocation } from './types';
import { getUrgencyColor, getStatusColor } from './utils';

interface LocationListProps {
  locations: ReliefLocation[];
  onLocationClick: (_location: ReliefLocation) => void;
  selectedLocationId?: string;
}

export function LocationList({
  locations,
  onLocationClick,
  selectedLocationId,
}: LocationListProps) {
  // Sort by priority score (highest first)
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }, [locations]);

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2.5 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            Điểm cứu trợ ({locations.length})
          </h3>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            Sắp xếp theo độ ưu tiên
          </span>
        </div>

        {sortedLocations.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              location_on
            </span>
            <p className="text-sm text-muted-foreground">
              Không có điểm cứu trợ nào trong vùng bao phủ của trạm
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sortedLocations.map((loc) => (
              <Card
                key={loc.id}
                onClick={() => onLocationClick(loc)}
                className={`cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-200 ${
                  selectedLocationId === loc.id
                    ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
                    : 'hover:bg-muted/60 hover:shadow-sm'
                }`}
              >
                <CardContent className="min-w-0 space-y-2.5 p-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="line-clamp-2 min-h-[2.5rem] break-words text-sm font-semibold leading-5 text-foreground">
                        {loc.locationName}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {loc.province || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        style={{
                          backgroundColor: getUrgencyColor(loc.urgency),
                          color: 'white',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: '15px',
                            lineHeight: 1,
                            display: 'block',
                          }}
                        >
                          {loc.urgency === 'high'
                            ? 'error'
                            : loc.urgency === 'medium'
                              ? 'warning'
                              : 'check_circle'}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start justify-end gap-2 text-[11px]">
                    <span className="max-w-[110px] shrink text-right text-muted-foreground leading-4 line-clamp-2">
                      {loc.lastUpdated}
                    </span>
                  </div>

                  {loc.distanceFromHQ?.straightLine && (
                    <div className="flex min-w-0 items-start gap-1 text-[11px] text-muted-foreground">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        straighten
                      </span>
                      <span className="line-clamp-2 break-words leading-4">
                        {loc.distanceFromHQ.straightLine.toFixed(1)} km từ trụ sở
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <Badge
                      style={{
                        backgroundColor: getStatusColor(loc.status),
                        color: 'white',
                      }}
                      className="text-[10px] leading-4"
                    >
                      {loc.status === 'unassigned'
                        ? 'Chưa xử lý'
                        : loc.status === 'assigned'
                          ? 'Đã gán'
                          : loc.status === 'on-the-way'
                            ? 'Đang đi'
                            : loc.status === 'completed'
                              ? 'Hoàn thành'
                              : 'Thất bại'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
