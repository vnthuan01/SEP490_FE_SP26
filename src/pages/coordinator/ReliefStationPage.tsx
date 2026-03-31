import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMyReliefStation } from '@/hooks/useReliefStation';
import { Skeleton } from '@/components/ui/skeleton';
import { coordinatorNavItems, coordinatorProjects } from './components/sidebarConfig';

const getStatusText = (status?: number) => {
  switch (status) {
    case 0:
      return 'Nháp';
    case 1:
      return 'Đang hoạt động';
    case 2:
      return 'Tạm ngưng';
    case 3:
      return 'Đã đóng';
    default:
      return 'Không xác định';
  }
};

const getStatusStyle = (status?: number) => {
  switch (status) {
    case 1:
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 2:
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 3:
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  }
};

const getLevelText = (level?: number) => {
  switch (level) {
    case 1:
      return 'Khu vực';
    case 2:
      return 'Tỉnh/Thành';
    case 3:
      return 'Địa phương';
    default:
      return 'Không xác định';
  }
};

export default function ReliefStationPage() {
  const { station, isLoading, isError, refetch } = useMyReliefStation();

  const coordinatesText = (() => {
    if (station?.latitude == null || station?.longitude == null) return '--';
    return `${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)}`;
  })();

  const updatedAtText = (() => {
    if (!station?.updatedAt) return 'Chưa cập nhật';
    return new Date(station.updatedAt).toLocaleString('vi-VN');
  })();

  return (
    <DashboardLayout projects={coordinatorProjects} navItems={coordinatorNavItems}>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-primary leading-tight">Trạm cứu trợ</h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg">
          Thông tin trạm hiện tại do điều phối viên đang quản lý.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-12" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto size-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Không tải được thông tin trạm</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hệ thống chưa thể lấy dữ liệu từ server. Vui lòng thử lại.
            </p>
            <Button variant="primary" onClick={() => refetch()} className="gap-2">
              <span className="material-symbols-outlined">refresh</span>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && station && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase font-semibold text-muted-foreground">Trạng thái</p>
                <p className="text-lg font-black text-foreground mt-2">
                  {getStatusText(station.status)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase font-semibold text-muted-foreground">Cấp trạm</p>
                <p className="text-lg font-black text-foreground mt-2">
                  {getLevelText(station.level)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase font-semibold text-muted-foreground">
                  Cập nhật gần nhất
                </p>
                <p className="text-base font-bold text-foreground mt-2">{updatedAtText}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Tên trạm
                    </p>
                    <h2 className="text-2xl font-black text-foreground mt-1">{station.name}</h2>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusStyle(station.status)}`}
                  >
                    {getStatusText(station.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Điều phối viên
                    </p>
                    <p className="text-base font-semibold text-foreground mt-1">
                      {station?.moderatorName || 'Chưa có thông tin'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">Khu vực</p>
                    <p className="text-base font-medium text-foreground mt-1">
                      {station.locationName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">Địa chỉ</p>
                    <p className="text-base font-medium text-foreground mt-1">
                      {station.address || 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Số liên hệ
                    </p>
                    <p className="text-base font-medium text-foreground mt-1">
                      {station.contactNumber || 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">Tọa độ</p>
                    <p className="text-base font-medium text-foreground mt-1">{coordinatesText}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase font-semibold text-muted-foreground">
                    Thông tin hệ thống
                  </p>
                  <p className="text-xl font-black text-foreground mt-1">Relief Station</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">Tạo lúc</p>
                    <p className="text-sm text-foreground mt-1">
                      {new Date(station.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold text-muted-foreground">
                      Cập nhật lúc
                    </p>
                    <p className="text-sm text-foreground mt-1">{updatedAtText}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 bg-background/60">
                  <p className="text-xs uppercase font-semibold text-muted-foreground">Ghi chú</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Dữ liệu được lấy trực tiếp từ endpoint moderator: my-station.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
