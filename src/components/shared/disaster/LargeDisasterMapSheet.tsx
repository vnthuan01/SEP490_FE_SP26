 
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { AnalyzeDisasterRiskResponse } from '@/services/disasterAnalysisService';

type Theme = { color: string; light: string; cardClass: string; icon: string };

type Props = {
  open: boolean;
  onOpenChange: (...args: [boolean]) => void;
  mapContent: ReactNode;
  selectedAnalysis: AnalyzeDisasterRiskResponse | null;
  filteredAnalyses: AnalyzeDisasterRiskResponse[];
  isLoadingDisaster: boolean;
  onSelectAnalysis: (...args: [AnalyzeDisasterRiskResponse]) => void;
  parseRiskLevelVN: (...args: [string | null | undefined]) => { label: string; class: string };
  parseWeatherConditionVN: (...args: [string | null | undefined]) => string;
  getEffectiveDisasterType: (...args: [AnalyzeDisasterRiskResponse]) => string;
  getDisasterTheme: (...args: [string | null | undefined]) => Theme;
  getDisplayDisasterLabel: (...args: [AnalyzeDisasterRiskResponse]) => string;
  title?: string;
  description?: string;
};

export function LargeDisasterMapSheet(props: Props) {
  const {
    open,
    onOpenChange,
    mapContent,
    selectedAnalysis,
    filteredAnalyses,
    isLoadingDisaster,
    onSelectAnalysis,
    parseRiskLevelVN,
    parseWeatherConditionVN,
    getEffectiveDisasterType,
    getDisasterTheme,
    getDisplayDisasterLabel,
    title = 'Dự báo thiên tai AI & Bản đồ trạm',
    description = 'Phân tích nguy cơ thiên tai do AI trong phạm vi tỉnh/thành mà trạm đang quản lý. Bấm vào marker trên bản đồ để chọn khu vực xem chi tiết.',
  } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[97vw] p-0 overflow-hidden">
        <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="relative min-h-[70vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-border p-4 lg:p-5 bg-background">
            {mapContent}
          </div>
          <div className="min-h-0 flex flex-col bg-card">
            <SheetHeader className="px-6 py-5 border-b border-border">
              <SheetTitle className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">storm</span>
                {title}
              </SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {selectedAnalysis && (
                <Card
                  className={`border ${getDisasterTheme(getEffectiveDisasterType(selectedAnalysis)).cardClass} overflow-hidden`}
                >
                  <CardHeader className="pt-5 pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="material-symbols-outlined">
                        {getDisasterTheme(getEffectiveDisasterType(selectedAnalysis)).icon}
                      </span>
                      Chi tiết phân tích AI — {getDisplayDisasterLabel(selectedAnalysis)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Điểm đang chọn:{' '}
                      <span className="font-semibold text-foreground">
                        {selectedAnalysis.locationName}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedAnalysis.ai?.summary?.trim() ? (
                      <div className="rounded-xl border border-current/20 bg-white/30 dark:bg-black/10 p-4">
                        <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                          Tóm tắt từ AI
                        </p>
                        <p className="text-sm leading-7">{selectedAnalysis.ai.summary}</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-current/20 bg-white/30 dark:bg-black/10 p-4">
                        <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                          Nhận định tạm thời từ dữ liệu
                        </p>
                        <ul className="space-y-1 text-sm list-disc pl-5">
                          <li>
                            Điểm rủi ro hiện tại:{' '}
                            {Number(selectedAnalysis.heuristic?.overallRiskScore ?? 0)}/100
                          </li>
                          <li>
                            Mưa cao nhất dự báo:{' '}
                            {selectedAnalysis.forecast?.maxDailyPrecipMm?.toFixed(1) ?? '0.0'} mm
                            vào{' '}
                            {selectedAnalysis.forecast?.peakRainDate
                              ? new Date(selectedAnalysis.forecast.peakRainDate).toLocaleDateString(
                                  'vi-VN',
                                )
                              : '--/--'}
                          </li>
                          <li>
                            Điều kiện hiện tại:{' '}
                            {parseWeatherConditionVN(selectedAnalysis.weather?.condition)},{' '}
                            {selectedAnalysis.weather?.temperatureC?.toFixed(1) ?? '0.0'}°C
                          </li>
                        </ul>
                      </div>
                    )}
                    {selectedAnalysis.ai?.detailedAnalysis?.trim() && (
                      <div className="rounded-xl border border-current/20 bg-white/30 dark:bg-black/10 p-4">
                        <p className="text-xs uppercase font-semibold opacity-70 mb-2">
                          Phân tích chi tiết
                        </p>
                        <p className="text-sm leading-7">{selectedAnalysis.ai.detailedAnalysis}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3">
                        <p className="text-xs opacity-70">Điểm rủi ro</p>
                        <p className="mt-1 font-black text-xl">
                          {Number(selectedAnalysis.heuristic?.overallRiskScore ?? 0)}/100
                        </p>
                        <p
                          className={`text-xs font-semibold ${parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).class}`}
                        >
                          {parseRiskLevelVN(selectedAnalysis.heuristic?.riskLevel).label}
                        </p>
                      </div>
                      <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3">
                        <p className="text-xs opacity-70">Điều kiện thời tiết</p>
                        <p className="mt-1 font-semibold">
                          {parseWeatherConditionVN(selectedAnalysis.weather?.condition)}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          Độ ẩm: {selectedAnalysis.weather?.humidity}% • Gió:{' '}
                          {selectedAnalysis.weather?.windKph?.toFixed(1)} km/h
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-current/20 bg-white/20 dark:bg-black/10 p-3">
                      <p className="text-xs opacity-70">Cập nhật lần gần nhất</p>
                      <p className="mt-1 font-semibold text-sm">
                        {selectedAnalysis.ai?.analyzedAt
                          ? new Date(selectedAnalysis.ai.analyzedAt).toLocaleString('vi-VN')
                          : new Date(
                              selectedAnalysis.forecast?.generatedAt ||
                                selectedAnalysis.weather?.observedAt,
                            ).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-red-500">radar</span>
                  Các nguy cơ thiên tai đã phân tích ({filteredAnalyses.length})
                </p>
                {isLoadingDisaster ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 text-sm text-muted-foreground">
                    Đang phân tích nguy cơ thiên tai theo tỉnh/thành…
                  </div>
                ) : (
                  filteredAnalyses.map((analysis) => {
                    const theme = getDisasterTheme(getEffectiveDisasterType(analysis));
                    const riskVN = parseRiskLevelVN(analysis.heuristic?.riskLevel);
                    const isActive = analysis.analysisLogId === selectedAnalysis?.analysisLogId;
                    const disasterTypeLabel = getDisplayDisasterLabel(analysis);
                    return (
                      <button
                        key={analysis.analysisLogId}
                        type="button"
                        onClick={() => onSelectAnalysis(analysis)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                          isActive
                            ? `${theme.cardClass} ring-1 ring-current`
                            : 'border-border bg-background hover:border-primary/30 hover:bg-muted/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="material-symbols-outlined text-base"
                                style={{ color: theme.color }}
                              >
                                {theme.icon}
                              </span>
                              <p className="font-bold text-foreground">{disasterTypeLabel}</p>
                              <Badge
                                variant="outline"
                                appearance="outline"
                                size="xs"
                                className="border"
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  auto_awesome
                                </span>
                                AI
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {analysis.locationName}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            appearance="outline"
                            size="sm"
                            className={`border shrink-0 ${theme.cardClass}`}
                          >
                            <span className={`font-semibold ${riskVN.class}`}>{riskVN.label}</span>
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <SheetFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng bản đồ
              </Button>
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
import type { ReactNode } from 'react';
