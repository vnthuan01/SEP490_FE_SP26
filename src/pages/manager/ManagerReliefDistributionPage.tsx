import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { managerNavGroups } from './components/sidebarConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCampaigns, useCampaignTeams } from '@/hooks/useCampaigns';
import { useCampaign } from '@/hooks/useCampaigns';
import { useProvinces } from '@/hooks/useLocations';
import {
  useDistributionPoints,
  useImportReliefHouseholds,
  useReliefHouseholds,
  useReliefPackages,
} from '@/hooks/useReliefDistribution';
import {
  CampaignType,
  DeliveryMode,
  getDeliveryModeBadgeVariant,
  getDeliveryModeLabel,
  getHouseholdFulfillmentStatusBadgeVariant,
  getHouseholdFulfillmentStatusLabel,
} from '@/enums/beEnums';
import type { HouseholdSampleForm } from './components/relief-distribution/types';
import { ManagerReliefDistributionPageHeader } from './components/relief-distribution/ManagerReliefDistributionPageHeader';
import { ManagerReliefDistributionHouseholdSampleTable } from './components/relief-distribution/ManagerReliefDistributionHouseholdSampleTable';
import { StatCard } from './components/ManagerInventoryShared';
import { parseApiError } from '@/lib/apiErrors';

const HOUSEHOLDS_PER_PAGE = 10;

const createDefaultHouseholdSample = (): HouseholdSampleForm => ({
  householdCode: `HH-${Math.floor(100 + Math.random() * 900)}`,
  headOfHouseholdName: '',
  contactPhone: '',
  address: '',
  latitude: 16.0544,
  longitude: 108.2022,
  householdSize: 1,
  isIsolated: false,
  deliveryMode: DeliveryMode.PickupAtPoint,
});

const buildDistinctCloneCode = (baseCode: string, existingCodes: Set<string>) => {
  const normalizedBase = baseCode.trim() || 'HH';
  let clonedCode = `${normalizedBase}-CLONE`;
  let copyCounter = 2;

  while (existingCodes.has(clonedCode.toUpperCase())) {
    clonedCode = `${normalizedBase}-CLONE-${copyCounter}`;
    copyCounter += 1;
  }

  return clonedCode;
};

const buildDistinctCloneName = (baseName: string, existingNames: Set<string>) => {
  const normalizedBase = baseName.trim() || 'Hộ dân thử nghiệm';
  let clonedName = `${normalizedBase} (Clone)`;
  let copyCounter = 2;

  while (existingNames.has(clonedName.toUpperCase())) {
    clonedName = `${normalizedBase} (Clone ${copyCounter})`;
    copyCounter += 1;
  }

  return clonedName;
};

export default function ManagerReliefDistributionPage() {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [householdSamples, setHouseholdSamples] = useState<HouseholdSampleForm[]>([
    createDefaultHouseholdSample(),
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [householdSearch, setHouseholdSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>(
    'all',
  );
  const [sampleErrors, setSampleErrors] = useState<Record<string, string>>({});

  const { campaigns, isLoading: campaignsLoading } = useCampaigns({ pageIndex: 1, pageSize: 200 });
  const reliefCampaigns = useMemo(
    () => campaigns.filter((campaign) => Number(campaign.type) === CampaignType.Relief),
    [campaigns],
  );
  const effectiveSelectedCampaignId = useMemo(() => {
    if (
      selectedCampaignId &&
      reliefCampaigns.some((campaign) => campaign.campaignId === selectedCampaignId)
    ) {
      return selectedCampaignId;
    }

    if (!selectedCampaignId && reliefCampaigns.length === 1) {
      return reliefCampaigns[0].campaignId;
    }

    return '';
  }, [reliefCampaigns, selectedCampaignId]);

  const { campaign: selectedCampaignDetail } = useCampaign(effectiveSelectedCampaignId);
  const { data: provinces } = useProvinces();
  const { teams } = useCampaignTeams(effectiveSelectedCampaignId);
  const { households } = useReliefHouseholds(effectiveSelectedCampaignId);
  const { distributionPoints } = useDistributionPoints(effectiveSelectedCampaignId);
  const { packages } = useReliefPackages(effectiveSelectedCampaignId);
  const importMutation = useImportReliefHouseholds();

  const selectedCampaignLocationName = useMemo(
    () =>
      provinces?.find((province) => province.id === selectedCampaignDetail?.locationId)?.fullName ||
      '',
    [provinces, selectedCampaignDetail?.locationId],
  );

  const activeStationName =
    selectedCampaignDetail?.stations?.find((station) => station.isActive)?.reliefStationName ||
    selectedCampaignDetail?.stations?.[0]?.reliefStationName ||
    '';

  const filteredHouseholds = useMemo(() => {
    const normalizedSearch = householdSearch.trim().toLowerCase();

    return households.filter((household) => {
      const matchesSearch =
        !normalizedSearch ||
        household.householdCode.toLowerCase().includes(normalizedSearch) ||
        household.headOfHouseholdName.toLowerCase().includes(normalizedSearch);

      const isAssigned = Boolean(household.campaignTeamId);
      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && isAssigned) ||
        (assignmentFilter === 'unassigned' && !isAssigned);

      return matchesSearch && matchesAssignment;
    });
  }, [assignmentFilter, householdSearch, households]);

  const totalPages = Math.max(1, Math.ceil(filteredHouseholds.length / HOUSEHOLDS_PER_PAGE));
  const paginatedHouseholds = useMemo(() => {
    const start = (currentPage - 1) * HOUSEHOLDS_PER_PAGE;
    return filteredHouseholds.slice(start, start + HOUSEHOLDS_PER_PAGE);
  }, [currentPage, filteredHouseholds]);

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const handleImport = async () => {
    const nextErrors: Record<string, string> = {};
    const seenCodes = new Set<string>();

    householdSamples.forEach((sample, index) => {
      const normalizedCode = sample.householdCode.trim().toUpperCase();
      if (!normalizedCode) nextErrors[`items.${index}.householdCode`] = 'Vui lòng nhập mã hộ.';
      else if (seenCodes.has(normalizedCode))
        nextErrors[`items.${index}.householdCode`] = 'Mã hộ đang bị trùng trong danh sách.';
      else seenCodes.add(normalizedCode);

      if (!sample.headOfHouseholdName.trim())
        nextErrors[`items.${index}.headOfHouseholdName`] = 'Vui lòng nhập tên chủ hộ.';
      if (!sample.address?.trim())
        nextErrors[`items.${index}.address`] = 'Vui lòng nhập địa chỉ hộ dân.';
      if (sample.contactPhone && !/^0\d{9,10}$/.test(sample.contactPhone.trim())) {
        nextErrors[`items.${index}.contactPhone`] =
          'Số điện thoại phải có 10-11 chữ số và bắt đầu bằng số 0.';
      }
      if (!sample.householdSize || sample.householdSize <= 0)
        nextErrors[`items.${index}.householdSize`] = 'Số người phải lớn hơn 0.';
      if (!Number.isFinite(sample.latitude) || sample.latitude < -90 || sample.latitude > 90)
        nextErrors[`items.${index}.latitude`] = 'Vĩ độ phải nằm trong khoảng từ -90 đến 90.';
      if (!Number.isFinite(sample.longitude) || sample.longitude < -180 || sample.longitude > 180)
        nextErrors[`items.${index}.longitude`] = 'Kinh độ phải nằm trong khoảng từ -180 đến 180.';
      if (sample.isIsolated && Number(sample.deliveryMode) !== DeliveryMode.DoorToDoor) {
        nextErrors[`items.${index}.deliveryMode`] =
          'Hộ bị cô lập phải dùng hình thức phát tận nơi.';
      }
      if (!sample.isIsolated && Number(sample.deliveryMode) !== DeliveryMode.PickupAtPoint) {
        nextErrors[`items.${index}.deliveryMode`] = 'Hộ không bị cô lập nên nhận tại điểm phát.';
      }
    });

    if (!effectiveSelectedCampaignId) nextErrors.form = 'Vui lòng chọn chiến dịch cứu trợ.';
    if (householdSamples.length === 0) nextErrors.form = 'Cần ít nhất 1 hộ dân để import.';
    if (Object.keys(nextErrors).length > 0) {
      setSampleErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setSampleErrors({});
      await importMutation.mutateAsync({
        campaignId: effectiveSelectedCampaignId,
        data: { households: householdSamples },
      });
      setHouseholdSamples([createDefaultHouseholdSample()]);
    } catch (error) {
      const parsed = parseApiError(error, 'Không thể lưu danh sách hộ dân');
      setSampleErrors({
        form: parsed.message,
      });
    }
  };

  const updateHouseholdSample = (index: number, patch: Partial<HouseholdSampleForm>) => {
    setHouseholdSamples((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
    setSampleErrors((prev) => {
      const next = { ...prev };
      Object.keys(next)
        .filter((key) => key.startsWith(`items.${index}.`))
        .forEach((key) => delete next[key]);
      delete next.form;
      return next;
    });
  };

  const addHouseholdSample = () => {
    setHouseholdSamples((prev) => [...prev, createDefaultHouseholdSample()]);
  };

  const removeHouseholdSample = (index: number) => {
    setHouseholdSamples((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const cloneHouseholdSample = (index: number) => {
    setHouseholdSamples((prev) => {
      const sampleToClone = prev[index];
      if (!sampleToClone) return prev;

      const existingCodes = new Set(
        prev.map((sample) => sample.householdCode.trim().toUpperCase()),
      );
      const existingNames = new Set(
        prev.map((sample) => sample.headOfHouseholdName.trim().toUpperCase()).filter(Boolean),
      );

      const clonedCode = buildDistinctCloneCode(sampleToClone.householdCode, existingCodes);
      const clonedName = buildDistinctCloneName(sampleToClone.headOfHouseholdName, existingNames);
      const normalizedPhone = (sampleToClone.contactPhone || '').trim();
      const clonedPhone = normalizedPhone
        ? `${normalizedPhone.slice(0, Math.max(0, normalizedPhone.length - 1))}${Math.floor(
            Math.random() * 10,
          )}`
        : '';
      const clonedAddress = sampleToClone.address?.trim()
        ? `${sampleToClone.address.trim()} - bản clone`
        : 'Địa chỉ hộ dân clone';

      const clonedSample: HouseholdSampleForm = {
        ...sampleToClone,
        householdCode: clonedCode,
        headOfHouseholdName: clonedName,
        contactPhone: clonedPhone,
        address: clonedAddress,
      };

      const next = [...prev];
      next.splice(index + 1, 0, clonedSample);
      return next;
    });

    setSampleErrors((prev) => {
      const next = { ...prev };
      delete next.form;
      return next;
    });
  };

  return (
    <DashboardLayout navGroups={managerNavGroups}>
      <div className="space-y-6 min-w-0">
        <ManagerReliefDistributionPageHeader
          selectedCampaignId={selectedCampaignId}
          onCampaignChange={(value) => {
            setSelectedCampaignId(value);
            setCurrentPage(1);
          }}
          campaignsLoading={campaignsLoading}
          campaigns={reliefCampaigns}
          stationName={activeStationName}
          locationName={selectedCampaignLocationName}
          campaignAddress={selectedCampaignDetail?.addressDetail || ''}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Hộ dân trong chiến dịch"
            value={households.length}
            note="Danh sách đã lưu trên hệ thống"
            icon="groups"
            iconClass="bg-primary/10 text-primary"
          />
          <StatCard
            label="Đội đã tham gia"
            value={teams.length}
            note="Các đội đã được gắn vào chiến dịch"
            icon="diversity_3"
            iconClass="bg-sky-500/10 text-sky-600 dark:text-sky-300"
          />
          <StatCard
            label="Điểm phát hiện có"
            value={distributionPoints.length}
            note="Manager chỉ theo dõi, không trực tiếp cấu hình"
            icon="location_on"
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-300"
          />
          <StatCard
            label="Gói cứu trợ hiện có"
            value={packages.length}
            note="Manager chỉ theo dõi, không trực tiếp cấu hình"
            icon="inventory_2"
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          />
        </div>

        <Card className="shadow-sm border border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-2 p-4 text-sm text-primary">
            <p className="font-semibold">Vai trò tại màn hình Manager</p>
            <p>
              Manager xem thông số chiến dịch và có thể thêm nhanh dữ liệu mẫu hộ dân để
              test/import. Các bước cấu hình điểm phát, tạo gói cứu trợ và phân công team được
              chuyển sang màn hình điều phối.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 grid-cols-1">
          <div className="min-w-0">
            <ManagerReliefDistributionHouseholdSampleTable
              householdSamples={householdSamples}
              updateHouseholdSample={updateHouseholdSample}
              removeHouseholdSample={removeHouseholdSample}
              cloneHouseholdSample={cloneHouseholdSample}
              addHouseholdSample={addHouseholdSample}
              applyLatitude={(latitude) =>
                setHouseholdSamples((prev) => prev.map((item) => ({ ...item, latitude })))
              }
              applyLongitude={(longitude) =>
                setHouseholdSamples((prev) => prev.map((item) => ({ ...item, longitude })))
              }
              handleImport={handleImport}
              submitDisabled={!effectiveSelectedCampaignId || householdSamples.length === 0}
              sampleErrors={sampleErrors}
              globalError={sampleErrors.form}
            />
            {households.length > 0 && (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                Chiến dịch này đã có dữ liệu hộ dân. Bạn vẫn có thể thêm tiếp để test, miễn là mã hộ
                không bị trùng.
              </p>
            )}
          </div>

          <Card className="shadow-sm min-w-0">
            <CardHeader className="space-y-1">
              <CardTitle>Danh sách hộ dân hiện có</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hiển thị theo trang để manager theo dõi tình hình dataseed và trạng thái phân phối.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-xl border">
                <div className="grid gap-3 border-b bg-muted/20 p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tìm kiếm hộ dân</p>
                    <Input
                      placeholder="Tìm theo mã hộ hoặc tên chủ hộ"
                      value={householdSearch}
                      onChange={(e) => setHouseholdSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Lọc theo phân công</p>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={assignmentFilter}
                      onChange={(e) =>
                        setAssignmentFilter(e.target.value as 'all' | 'assigned' | 'unassigned')
                      }
                    >
                      <option value="all">Tất cả</option>
                      <option value="assigned">Đã gán team</option>
                      <option value="unassigned">Chưa gán team</option>
                    </select>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Mã hộ</TableHead>
                      <TableHead>Chủ hộ</TableHead>
                      <TableHead>Hình thức nhận</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Đã gán team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHouseholds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Không có hộ dân phù hợp bộ lọc hiện tại.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedHouseholds.map((household) => (
                        <TableRow key={household.campaignHouseholdId} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{household.householdCode}</TableCell>
                          <TableCell>{household.headOfHouseholdName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getDeliveryModeBadgeVariant(household.deliveryMode)}
                              appearance="light"
                            >
                              {getDeliveryModeLabel(household.deliveryMode)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getHouseholdFulfillmentStatusBadgeVariant(
                                household.fulfillmentStatus,
                              )}
                              appearance="light"
                            >
                              {getHouseholdFulfillmentStatusLabel(household.fulfillmentStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={household.campaignTeamId ? 'success' : 'outline'}
                              appearance="light"
                            >
                              {household.campaignTeamId ? 'Đã gán' : 'Chưa gán'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Trang {safeCurrentPage}/{totalPages} · Tổng {households.length} hộ dân
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    Trang trước
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    Trang sau
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
