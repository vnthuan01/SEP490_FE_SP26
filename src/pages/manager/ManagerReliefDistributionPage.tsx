import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { managerNavGroups } from './components/sidebarConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { StatCard } from './components/ManagerInventoryShared';
import { parseApiError } from '@/lib/apiErrors';
import { ReliefAdvancedFilters } from '@/components/shared/relief-distribution/ReliefAdvancedFilters';
import type { ReliefAdvancedFiltersValue } from '@/components/shared/relief-distribution/types';
import { ReliefHouseholdImportCard } from '@/pages/shared/relief-distribution/ReliefHouseholdImportCard';

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

const IMPORT_TEMPLATE_HEADERS = [
  'Mã hộ',
  'Chủ hộ',
  'Số điện thoại',
  'Địa chỉ',
  'Vĩ độ',
  'Kinh độ',
  'Số người',
  'Bị cô lập',
  'Mức ngập',
  'Mức cô lập',
  'Cần xuồng',
  'Cần dẫn đường',
];

const DEFAULT_IMPORT_COLUMN_MAPPING: Record<string, string> = {
  householdCode: 'Mã hộ',
  headOfHouseholdName: 'Chủ hộ',
  contactPhone: 'Số điện thoại',
  address: 'Địa chỉ',
  latitude: 'Vĩ độ',
  longitude: 'Kinh độ',
  householdSize: 'Số người',
  isIsolated: 'Bị cô lập',
  floodSeverityLevel: 'Mức ngập',
  isolationSeverityLevel: 'Mức cô lập',
  requiresBoat: 'Cần xuồng',
  requiresLocalGuide: 'Cần dẫn đường',
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
  const [deliveryModeFilter, setDeliveryModeFilter] = useState<number | undefined>(undefined);
  const [teamFilter, setTeamFilter] = useState<string | undefined>(undefined);
  const [pointFilter, setPointFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sampleErrors, setSampleErrors] = useState<Record<string, string>>({});
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importColumnMapping, setImportColumnMapping] = useState<Record<string, string>>(
    DEFAULT_IMPORT_COLUMN_MAPPING,
  );

  const filtersValue: ReliefAdvancedFiltersValue = {
    search: householdSearch,
    assignment: assignmentFilter,
    deliveryMode: deliveryModeFilter,
    teamId: teamFilter,
    distributionPointId: pointFilter,
    status: statusFilter,
  };

  const handleFiltersChange = (next: ReliefAdvancedFiltersValue) => {
    setHouseholdSearch(next.search);
    setAssignmentFilter(next.assignment ?? 'all');
    setDeliveryModeFilter(next.deliveryMode);
    setTeamFilter(next.teamId);
    setPointFilter(next.distributionPointId);
    setStatusFilter(next.status);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setHouseholdSearch('');
    setAssignmentFilter('all');
    setDeliveryModeFilter(undefined);
    setTeamFilter(undefined);
    setPointFilter(undefined);
    setStatusFilter(undefined);
    setCurrentPage(1);
  };

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
  const { households, pagination } = useReliefHouseholds(effectiveSelectedCampaignId, {
    pageIndex: currentPage,
    pageSize: HOUSEHOLDS_PER_PAGE,
    search: householdSearch || undefined,
    isAssigned: assignmentFilter === 'all' ? undefined : assignmentFilter === 'assigned',
    campaignTeamId: teamFilter,
    distributionPointId: pointFilter,
    deliveryMode: deliveryModeFilter,
    status: statusFilter,
  });
  const { distributionPoints } = useDistributionPoints(effectiveSelectedCampaignId, {
    campaignTeamId: teamFilter,
    deliveryMode: deliveryModeFilter,
  });
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

  const filteredHouseholds = households;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const paginatedHouseholds = filteredHouseholds;
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
    if (householdSamples.length === 0) nextErrors.form = 'Cần ít nhất 1 hộ dân để nhập.';
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
        ? `${sampleToClone.address.trim()} - bản sao`
        : 'Địa chỉ hộ dân bản sao';

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

  const parseImportedHouseholdFiles = async (files: FileList | null) => {
    if (!files?.length) {
      setImportFiles([]);
      return;
    }

    const selectedFiles = Array.from(files);
    setImportFiles(selectedFiles);

    const parsedRows: HouseholdSampleForm[] = [];

    for (const file of selectedFiles) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });
      const headers =
        XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, range: 0 })[0] || [];
      setImportHeaders(headers.filter(Boolean));

      rows.forEach((row, index) => {
        const getMapped = (field: string) => row[importColumnMapping[field] || ''];
        const isIsolatedValue = String(getMapped('isIsolated') || '')
          .trim()
          .toLowerCase();
        const isIsolated = ['true', '1', 'yes', 'co', 'có', 'bi co lap', 'bị cô lập'].includes(
          isIsolatedValue,
        );

        parsedRows.push({
          householdCode:
            String(getMapped('householdCode') || '').trim() ||
            `HH-IMPORT-${Date.now()}-${index + 1}`,
          headOfHouseholdName: String(getMapped('headOfHouseholdName') || '').trim(),
          contactPhone: String(getMapped('contactPhone') || '').trim(),
          address: String(getMapped('address') || '').trim(),
          latitude: Number(getMapped('latitude') || 16.0544),
          longitude: Number(getMapped('longitude') || 108.2022),
          householdSize: Number(getMapped('householdSize') || 1),
          isIsolated,
          deliveryMode: isIsolated ? DeliveryMode.DoorToDoor : DeliveryMode.PickupAtPoint,
          floodSeverityLevel: getMapped('floodSeverityLevel')
            ? Number(getMapped('floodSeverityLevel'))
            : undefined,
          isolationSeverityLevel: getMapped('isolationSeverityLevel')
            ? Number(getMapped('isolationSeverityLevel'))
            : undefined,
          requiresBoat: Boolean(getMapped('requiresBoat')),
          requiresLocalGuide: Boolean(getMapped('requiresLocalGuide')),
        });
      });
    }

    if (parsedRows.length > 0) {
      setHouseholdSamples(parsedRows);
      toast.success(`Đã nạp ${parsedRows.length} hộ dân từ file vào bảng nhập liệu.`);
    }
  };

  const downloadImportTemplate = (format: 'csv' | 'xlsx') => {
    const sampleRows = [
      {
        'Mã hộ': 'HH-001',
        'Chủ hộ': 'Nguyễn Văn A',
        'Số điện thoại': '0900000000',
        'Địa chỉ': 'Hòa Vang, Đà Nẵng, Miền Trung',
        'Vĩ độ': 16.0544,
        'Kinh độ': 108.2022,
        'Số người': 4,
        'Bị cô lập': 'false',
        'Mức ngập': 2,
        'Mức cô lập': 0,
        'Cần xuồng': 'false',
        'Cần dẫn đường': 'false',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: IMPORT_TEMPLATE_HEADERS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Households');

    if (format === 'csv') {
      XLSX.writeFile(workbook, 'mau-ho-dan-cuu-tro.csv', { bookType: 'csv' });
      return;
    }

    XLSX.writeFile(workbook, 'mau-ho-dan-cuu-tro.xlsx');
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
            value={pagination?.totalCount ?? households.length}
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
              Manager xem thông số chiến dịch và có thể thêm nhanh dữ liệu mẫu hộ dân để thử
              nghiệm/nhập liệu. Các bước cấu hình điểm phát, tạo gói cứu trợ và phân công đội được
              chuyển sang màn hình điều phối.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 grid-cols-1">
          <div className="min-w-0">
            <ReliefHouseholdImportCard
              title="Bước 1 · Lập danh sách hộ dân mẫu"
              description="Dữ liệu hộ dân thường đã được địa phương chuẩn bị. Manager dùng khối này để nhập mới hoặc bổ sung danh sách hộ dân khi cần đồng bộ dữ liệu chiến dịch."
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
              importFiles={importFiles}
              onImportFilesSelected={(files) => {
                void parseImportedHouseholdFiles(files);
              }}
              onRemoveImportFile={(index) =>
                setImportFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
              }
              importHeaders={importHeaders}
              importColumnMapping={importColumnMapping}
              onImportColumnMappingChange={(field, header) =>
                setImportColumnMapping((prev) => ({ ...prev, [field]: header }))
              }
              onDownloadCsvTemplate={() => downloadImportTemplate('csv')}
              onDownloadXlsxTemplate={() => downloadImportTemplate('xlsx')}
              badgeLabel="Dùng khi phát sinh"
            />
            {households.length > 0 && (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                Chiến dịch này đã có dữ liệu hộ dân. Bạn vẫn có thể thêm tiếp để thử nghiệm, miễn là
                mã hộ không bị trùng.
              </p>
            )}
          </div>

          <Card className="shadow-sm min-w-0">
            <CardHeader className="space-y-1">
              <CardTitle>Danh sách hộ dân hiện có</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hiển thị theo trang để manager theo dõi danh sách hộ dân và trạng thái phân phối.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <ReliefAdvancedFilters
                  value={filtersValue}
                  onChange={handleFiltersChange}
                  onReset={resetFilters}
                  expanded={filtersExpanded}
                  onExpandedChange={setFiltersExpanded}
                  teams={teams.map((team) => ({
                    label: team.teamName,
                    value: team.campaignTeamId,
                  }))}
                  distributionPoints={distributionPoints.map((point) => ({
                    label: point.name,
                    value: point.distributionPointId,
                  }))}
                  title="Bộ lọc hộ dân chiến dịch"
                />
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Mã hộ</TableHead>
                        <TableHead>Chủ hộ</TableHead>
                        <TableHead>Đội thực hiện</TableHead>
                        <TableHead>Điểm phát</TableHead>
                        <TableHead>SĐT</TableHead>
                        <TableHead>Địa chỉ</TableHead>
                        <TableHead>Độ cô lập</TableHead>
                        <TableHead>Hình thức nhận</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Đã gán team</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHouseholds.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="h-24 text-center text-muted-foreground"
                          >
                            Không có hộ dân phù hợp bộ lọc hiện tại.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedHouseholds.map((household) => (
                          <TableRow
                            key={household.campaignHouseholdId}
                            className="hover:bg-muted/30"
                          >
                            <TableCell className="font-medium">{household.householdCode}</TableCell>
                            <TableCell>{household.headOfHouseholdName}</TableCell>
                            <TableCell>
                              {household.campaignTeamName ? (
                                <Badge variant="info" appearance="light">
                                  {household.campaignTeamName}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Chưa gán</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {household.distributionPointName ? (
                                <Badge variant="outline" appearance="light">
                                  {household.distributionPointName}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{household.contactPhone || '—'}</TableCell>
                            <TableCell
                              className="max-w-[220px] truncate"
                              title={household.address || ''}
                            >
                              {household.address || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={household.isIsolated ? 'warning' : 'outline'}
                                appearance="light"
                              >
                                {household.isIsolated ? 'Cô lập' : 'Bình thường'}
                              </Badge>
                            </TableCell>
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
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Trang {safeCurrentPage}/{totalPages} · Tổng{' '}
                  {pagination?.totalCount ?? households.length} hộ dân
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    Trang trước
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="gap-2"
                  >
                    Trang sau
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
