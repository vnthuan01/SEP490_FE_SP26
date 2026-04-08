import { useCallback, useEffect, useMemo } from 'react';
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
import { formatVietnamesePhoneNumber, normalizeVietnamesePhoneNumberInput } from '@/lib/utils';
import { StationAddressLookup } from './StationAddressLookup';

export interface EditStationFormData {
  name: string;
  address: string;
  contactNumber: string;
  longitude: number;
  latitude: number;
  coverageRadiusKm: number;
}

interface EditStationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: EditStationFormData) => Promise<void> | void;
  initialData?: Partial<EditStationFormData> | null;
}

export function EditStationModal({ open, onClose, onSubmit, initialData }: EditStationModalProps) {
  const getDefaultValues = useCallback(
    (): EditStationFormData => ({
      name: initialData?.name || '',
      address: initialData?.address || '',
      contactNumber: initialData?.contactNumber || '',
      longitude: Number(initialData?.longitude || 0),
      latitude: Number(initialData?.latitude || 0),
      coverageRadiusKm: Number(initialData?.coverageRadiusKm || 1),
    }),
    [initialData],
  );

  const defaultValues = useMemo(() => getDefaultValues(), [getDefaultValues]);

  const form = useForm<EditStationFormData>({
    defaultValues,
  });

  const watchedAddress = useWatch({ control: form.control, name: 'address' });
  const watchedLatitude = useWatch({ control: form.control, name: 'latitude' });
  const watchedLongitude = useWatch({ control: form.control, name: 'longitude' });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const handleSubmitForm = async (formData: EditStationFormData) => {
    await onSubmit({
      ...formData,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      coverageRadiusKm: Number(formData.coverageRadiusKm),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[98vw] max-w-[1200px] max-h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader>
          <div className="px-6 pt-6">
            <DialogTitle>Chỉnh sửa trạm cứu trợ</DialogTitle>
          </div>
          <DialogDescription className="px-6">
            Cập nhật thông tin trạm cấp tỉnh/thành phố.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="edit-station-form"
            onSubmit={form.handleSubmit(handleSubmitForm)}
            className="space-y-6 overflow-y-auto px-6 pb-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  rules={{ required: 'Vui lòng nhập bán kính bao phủ', min: 1 }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Bán kính bao phủ (km) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step="1" {...field} />
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
                        <FormLabel>Vĩ độ</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.000001" {...field} />
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
                        <FormLabel>Kinh độ</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.000001" {...field} />
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
          <Button variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" form="edit-station-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
