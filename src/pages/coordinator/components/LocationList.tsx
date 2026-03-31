import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReliefLocation } from './types';
import { getUrgencyColor, getStatusColor, getDangerColor } from './utils';

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
    <ScrollArea className="flex-1 p-4 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">
          Điểm cứu trợ ({locations.length})
        </h3>
        <span className="text-xs text-muted-foreground">Sắp xếp theo độ ưu tiên</span>
      </div>

      <div className="flex flex-col gap-2">
        {sortedLocations.map((loc) => (
          <Card
            key={loc.id}
            onClick={() => onLocationClick(loc)}
            className={`cursor-pointer transition ${
              selectedLocationId === loc.id
                ? 'border-primary bg-primary/5 shadow-md gap-1'
                : 'hover:bg-muted/60'
            }`}
          >
            <CardContent className="p-3 space-y-2 mt-2 ">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{loc.locationName}</p>
                  <p className="text-xs text-muted-foreground truncate">{loc.province}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge
                    style={{
                      backgroundColor: getUrgencyColor(loc.urgency),
                      color: 'white',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '16px',
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

                  {loc.priorityScore !== undefined && (
                    <Badge
                      style={{
                        backgroundColor: getDangerColor(loc.priorityScore),
                        color: 'white',
                      }}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {loc.priorityScore}%
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    group
                  </span>
                  {loc.peopleCount} người
                </span>
                <span className="text-muted-foreground">{loc.lastUpdated}</span>
              </div>

              {loc.distanceFromHQ?.straightLine && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    straighten
                  </span>
                  {loc.distanceFromHQ.straightLine.toFixed(1)} km từ trụ sở
                </div>
              )}

              <div className="flex items-center gap-1 flex-wrap">
                <Badge
                  style={{
                    backgroundColor: getStatusColor(loc.status),
                    color: 'white',
                  }}
                  className="text-[10px]"
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
                {loc.needs.food && (
                  <span className="material-symbols-outlined text-[14px] text-orange-600">
                    restaurant
                  </span>
                )}
                {loc.needs.water && (
                  <span className="material-symbols-outlined text-[14px] text-blue-600">
                    water_drop
                  </span>
                )}
                {loc.needs.medicine && (
                  <span className="material-symbols-outlined text-[14px] text-red-600">
                    medication
                  </span>
                )}
                {loc.needs.emergencyRescue && (
                  <span className="material-symbols-outlined text-[14px] text-red-700">
                    emergency
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
