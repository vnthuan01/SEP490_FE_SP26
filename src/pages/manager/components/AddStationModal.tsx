import { useCallback, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProvinces } from '@/hooks/useLocations';
import { formatVietnamesePhoneNumber, normalizeVietnamesePhoneNumberInput } from '@/lib/utils';
import { StationAddressLookup } from './StationAddressLookup';

export interface CreateStationFormData {
  name: string;
  address: string;
  contactNumber: string;
  locationId: string;
  latitude: number;
  longitude: number;
  coverageRadiusKm: number;
}

interface AddStationModalProps {
  open: boolean;
  onClose: () => void;

  onSubmit: (formData: CreateStationFormData) => Promise<void> | void;
  defaultLocationId?: string;
}

export function AddStationModal({
  open,
  onClose,
  onSubmit,
  defaultLocationId,
}: AddStationModalProps) {
  const { data: provinces, isLoading: isLoadingProvinces } = useProvinces();
  const availableProvinces = (provinces ?? []).filter(
    (province) => typeof province.id === 'string' && province.id.trim().length > 0,
  );

  const getDefaultValues = useCallback(
    (locationId?: string): CreateStationFormData => ({
      name: '',
      address: '',
      contactNumber: '',
      locationId: locationId || '',
      latitude: 0,
      longitude: 0,
      coverageRadiusKm: 1,
    }),
    [],
  );

  const defaultValues = useMemo(
    () => getDefaultValues(defaultLocationId),
    [defaultLocationId, getDefaultValues],
  );

  const form = useForm<CreateStationFormData>({
    defaultValues,
  });

  const watchedAddress = useWatch({ control: form.control, name: 'address' });
  const watchedLatitude = useWatch({ control: form.control, name: 'latitude' });
  const watchedLongitude = useWatch({ control: form.control, name: 'longitude' });

  if (open && form.formState.defaultValues !== defaultValues) {
    form.reset(defaultValues);
  }

  const handleSubmitForm = async (formData: CreateStationFormData) => {
    await onSubmit({
      ...formData,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      coverageRadiusKm: Number(formData.coverageRadiusKm),
    });
    form.reset(getDefaultValues(defaultLocationId));
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[98vw] max-w-[1200px] max-h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader>
          <div className="px-6 pt-6">
            <DialogTitle>Thêm trạm cứu trợ mới</DialogTitle>
          </div>
          <DialogDescription className="px-6">
            Điền thông tin chi tiết để tạo một trạm mới trong khu vực quản lý.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="add-station-form"
            onSubmit={form.handleSubmit(handleSubmitForm)}
            className="space-y-4 overflow-y-auto px-6 pb-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Vui lòng nhập tên trạm' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tên trạm <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Vd: Trạm cứu trợ trung tâm..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  rules={{ required: 'Vui lòng chọn Tỉnh/Thành phố' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tỉnh/Thành phố <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingProvinces}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingProvinces ? 'Đang tải...' : 'Chọn Tỉnh/Thành phố'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableProvinces.map((province) => (
                            <SelectItem key={province.id} value={province.id}>
                              {province.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactNumber"
                  rules={{ required: 'Vui lòng nhập số điện thoại' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Số điện thoại liên hệ <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Vd: 0912 345 678"
                          value={formatVietnamesePhoneNumber(field.value)}
                          onChange={(e) =>
                            field.onChange(normalizeVietnamesePhoneNumberInput(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverageRadiusKm"
                  rules={{ required: true, min: 1 }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Bán kính bao phủ (km) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step="1" placeholder="Vd: 10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <StationAddressLookup
                  address={watchedAddress || ''}
                  latitude={Number(watchedLatitude || 0)}
                  longitude={Number(watchedLongitude || 0)}
                  onPickAddress={({ address, latitude, longitude }) => {
                    form.setValue('address', address);
                    form.setValue('latitude', latitude);
                    form.setValue('longitude', longitude);
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    rules={{ required: true, min: -90, max: 90 }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Vĩ độ <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="Vd: 10.762622"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude"
                    rules={{ required: true, min: -180, max: 180 }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Kinh độ <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder="Vd: 106.660172"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter className="px-6 pb-6">
          <Button variant="destructive" onClick={onClose} disabled={form.formState.isSubmitting}>
            <span className="material-symbols-outlined text-lg">close</span>
            Hủy
          </Button>
          <Button
            variant="primary"
            className="gap-2"
            type="submit"
            form="add-station-form"
            disabled={form.formState.isSubmitting}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            {form.formState.isSubmitting ? 'Đang tạo...' : 'Tạo trạm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
