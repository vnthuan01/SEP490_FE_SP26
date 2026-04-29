import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploadCard } from '@/components/ui/file-upload-card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HouseholdSampleForm } from '@/pages/manager/components/relief-distribution/types';
import { ManagerReliefDistributionHouseholdSampleTable } from '@/pages/manager/components/relief-distribution/ManagerReliefDistributionHouseholdSampleTable';

export function ReliefHouseholdImportCard({
  title,
  description,
  householdSamples,
  updateHouseholdSample,
  removeHouseholdSample,
  cloneHouseholdSample,
  addHouseholdSample,
  applyLatitude,
  applyLongitude,
  handleImport,
  submitDisabled,
  sampleErrors,
  globalError,
  importFiles,
  onImportFilesSelected,
  onRemoveImportFile,
  importHeaders = [],
  importColumnMapping = {},
  onImportColumnMappingChange,
  onDownloadCsvTemplate,
  onDownloadXlsxTemplate,
  collapsible = false,
  defaultOpen = true,
  badgeLabel,
}: {
  title: string;
  description: string;
  householdSamples: HouseholdSampleForm[];
  updateHouseholdSample: (index: number, patch: Partial<HouseholdSampleForm>) => void;
  removeHouseholdSample: (index: number) => void;
  cloneHouseholdSample: (index: number) => void;
  addHouseholdSample: () => void;
  applyLatitude: (value: number) => void;
  applyLongitude: (value: number) => void;
  handleImport: () => void;
  submitDisabled: boolean;
  sampleErrors: Record<string, string>;
  globalError?: string;
  importFiles: File[];
  onImportFilesSelected: (files: FileList | null) => void;
  onRemoveImportFile: (index: number) => void;
  importHeaders?: string[];
  importColumnMapping?: Record<string, string>;
  onImportColumnMappingChange?: (field: string, header: string) => void;
  onDownloadCsvTemplate?: () => void;
  onDownloadXlsxTemplate?: () => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badgeLabel?: string;
}) {
  const mappingFields = [
    { key: 'householdCode', label: 'Mã hộ' },
    { key: 'headOfHouseholdName', label: 'Chủ hộ' },
    { key: 'contactPhone', label: 'Số điện thoại' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'latitude', label: 'Vĩ độ' },
    { key: 'longitude', label: 'Kinh độ' },
    { key: 'householdSize', label: 'Số người' },
    { key: 'isIsolated', label: 'Bị cô lập' },
    { key: 'floodSeverityLevel', label: 'Mức ngập' },
    { key: 'isolationSeverityLevel', label: 'Mức cô lập' },
    { key: 'requiresBoat', label: 'Cần xuồng' },
    { key: 'requiresLocalGuide', label: 'Cần dẫn đường' },
  ];

  const content = (
    <div className="space-y-4 ">
      <Card className="shadow-sm border border-primary/20 bg-primary/5 p-2">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{title}</CardTitle>
            {badgeLabel ? <Badge variant="outline">{badgeLabel}</Badge> : null}
          </div>
          <p className="text-sm text-primary/80">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadCard
            title="Tải file danh sách hộ dân"
            description="Chọn file Excel/CSV để hệ thống đọc dữ liệu và đổ vào bảng nhập liệu bên dưới trước khi lưu."
            accept=".csv,.xlsx,.xls"
            multiple
            icon="upload_file"
            selectedFiles={importFiles}
            onFilesSelected={onImportFilesSelected}
            onRemoveFile={onRemoveImportFile}
          />
          {importFiles.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              File đã được nạp để đổ dữ liệu vào bảng hộ dân phía dưới. Hãy rà soát lại trước khi
              lưu vào hệ thống.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {onDownloadCsvTemplate ? (
              <Button type="button" variant="outline" onClick={onDownloadCsvTemplate}>
                Tải mẫu CSV
              </Button>
            ) : null}
            {onDownloadXlsxTemplate ? (
              <Button type="button" variant="outline" onClick={onDownloadXlsxTemplate}>
                Tải mẫu XLSX
              </Button>
            ) : null}
          </div>

          {importHeaders.length > 0 && onImportColumnMappingChange ? (
            <div className="rounded-xl border border-border bg-background/80 p-4">
              <p className="mb-3 text-sm font-medium text-foreground">
                Mapping cột từ file địa phương
              </p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {mappingFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                    <Select
                      value={importColumnMapping[field.key] || 'none'}
                      onValueChange={(value) =>
                        onImportColumnMappingChange(field.key, value === 'none' ? '' : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn cột nguồn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không map</SelectItem>
                        {importHeaders.map((header) => (
                          <SelectItem key={`${field.key}-${header}`} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ManagerReliefDistributionHouseholdSampleTable
        householdSamples={householdSamples}
        updateHouseholdSample={updateHouseholdSample}
        removeHouseholdSample={removeHouseholdSample}
        cloneHouseholdSample={cloneHouseholdSample}
        addHouseholdSample={addHouseholdSample}
        applyLatitude={applyLatitude}
        applyLongitude={applyLongitude}
        handleImport={handleImport}
        submitDisabled={submitDisabled}
        sampleErrors={sampleErrors}
        globalError={globalError}
      />
    </div>
  );

  if (!collapsible) return content;

  return (
    <Collapsible defaultOpen={defaultOpen} className="space-y-3">
      <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">{title}</p>
              {badgeLabel ? <Badge variant="outline">{badgeLabel}</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="gap-2">
              <span className="material-symbols-outlined text-[18px]">unfold_more</span>
              Mở / thu gọn
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>{content}</CollapsibleContent>
    </Collapsible>
  );
}
