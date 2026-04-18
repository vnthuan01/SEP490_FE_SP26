import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeliveryMode } from '@/enums/beEnums';
import { CopyIcon, TrashIcon } from 'lucide-react';
import { formatNumberInputVN, parseFormattedNumber } from '@/lib/utils';
import type { HouseholdSampleForm } from './types';

export function ManagerReliefDistributionHouseholdSampleTable({
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
}: {
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
}) {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Bước 1 · Lập danh sách hộ dân mẫu</CardTitle>
        <p className="text-sm text-muted-foreground">
          Quản lý lập danh sách hộ dân mẫu để điều phối viên phân công đội và gói cứu trợ phù hợp.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 min-w-0">
        <div className="overflow-x-auto rounded-xl border max-w-full">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[120px]">Mã hộ</TableHead>
                <TableHead className="w-[160px]">Chủ hộ</TableHead>
                <TableHead className="w-[130px]">Số điện thoại</TableHead>
                <TableHead className="w-[180px]">Địa chỉ</TableHead>
                <TableHead className="w-[90px]">Số người</TableHead>
                <TableHead className="w-[170px]">Hình thức nhận</TableHead>
                <TableHead className="w-[140px]">Tình trạng</TableHead>
                <TableHead className="w-[150px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {householdSamples.map((household, index) => (
                <TableRow key={`${household.householdCode}-${index}`} className="align-top">
                  <TableCell>
                    <Input
                      value={household.householdCode}
                      onChange={(e) =>
                        updateHouseholdSample(index, { householdCode: e.target.value })
                      }
                    />
                    {sampleErrors[`items.${index}.householdCode`] && (
                      <p className="mt-1 text-xs text-destructive">
                        {sampleErrors[`items.${index}.householdCode`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={household.headOfHouseholdName}
                      onChange={(e) =>
                        updateHouseholdSample(index, { headOfHouseholdName: e.target.value })
                      }
                    />
                    {sampleErrors[`items.${index}.headOfHouseholdName`] && (
                      <p className="mt-1 text-xs text-destructive">
                        {sampleErrors[`items.${index}.headOfHouseholdName`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={household.contactPhone || ''}
                      onChange={(e) =>
                        updateHouseholdSample(index, { contactPhone: e.target.value })
                      }
                    />
                    {sampleErrors[`items.${index}.contactPhone`] && (
                      <p className="mt-1 text-xs text-destructive">
                        {sampleErrors[`items.${index}.contactPhone`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={household.address || ''}
                      onChange={(e) => updateHouseholdSample(index, { address: e.target.value })}
                    />
                    {sampleErrors[`items.${index}.address`] && (
                      <p className="mt-1 text-xs text-destructive">
                        {sampleErrors[`items.${index}.address`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formatNumberInputVN(household.householdSize)}
                      onChange={(e) =>
                        updateHouseholdSample(index, {
                          householdSize: parseFormattedNumber(e.target.value),
                        })
                      }
                    />
                    {sampleErrors[`items.${index}.householdSize`] && (
                      <p className="mt-1 text-xs text-destructive">
                        {sampleErrors[`items.${index}.householdSize`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={String(household.deliveryMode)}
                      onValueChange={(value) =>
                        updateHouseholdSample(index, {
                          deliveryMode: Number(value),
                          isIsolated: Number(value) === DeliveryMode.DoorToDoor,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn hình thức" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={String(DeliveryMode.PickupAtPoint)}>
                          Nhận tại điểm phát
                        </SelectItem>
                        <SelectItem value={String(DeliveryMode.DoorToDoor)}>
                          Phát tận nơi
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {sampleErrors[`items.${index}.deliveryMode`] && (
                      <p className="mt-1 text-xs text-destructive">
                        {sampleErrors[`items.${index}.deliveryMode`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={household.isIsolated ? 'true' : 'false'}
                      onValueChange={(value) =>
                        updateHouseholdSample(index, {
                          isIsolated: value === 'true',
                          deliveryMode:
                            value === 'true' ? DeliveryMode.DoorToDoor : DeliveryMode.PickupAtPoint,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Không bị cô lập</SelectItem>
                        <SelectItem value="true">Bị cô lập</SelectItem>
                      </SelectContent>
                    </Select>
                    {sampleErrors[`items.${index}.isIsolated`] && (
                      <p className="mt-1 text-xs text-destructive">
                        {sampleErrors[`items.${index}.isIsolated`]}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cloneHouseholdSample(index)}
                      >
                        <CopyIcon className="w-4 h-4" />
                        Clone mới
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={householdSamples.length === 1}
                        onClick={() => removeHouseholdSample(index)}
                      >
                        <TrashIcon className="w-4 h-4" />
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-2 xl:w-[360px]">
            <Input
              type="number"
              placeholder="Vĩ độ mặc định"
              value={householdSamples[0]?.latitude ?? 16.0544}
              onChange={(e) => applyLatitude(Number(e.target.value))}
            />
            <Input
              type="number"
              placeholder="Kinh độ mặc định"
              value={householdSamples[0]?.longitude ?? 108.2022}
              onChange={(e) => applyLongitude(Number(e.target.value))}
            />
          </div>
          {globalError && <p className="text-sm text-destructive xl:flex-1">{globalError}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={addHouseholdSample}>
              Thêm dòng hộ dân
            </Button>
            <Button onClick={handleImport} disabled={submitDisabled}>
              Lưu danh sách hộ dân
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
