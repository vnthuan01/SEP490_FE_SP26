import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

export interface CreateStationFormData {
  name: string;
  address: string;
  contactNumber: string;
  locationId: string;
  latitude: number;
  longitude: number;
}

interface AddStationModalProps {
  open: boolean;
  onClose: () => void;
   
  onSubmit: (formData: CreateStationFormData) => void;
  defaultLocationId?: string;
}

export function AddStationModal({
  open,
  onClose,
  onSubmit,
  defaultLocationId,
}: AddStationModalProps) {
  const { data: provinces, isLoading: isLoadingProvinces } = useProvinces();

  const form = useForm<CreateStationFormData>({
    defaultValues: {
      name: '',
      address: '',
      contactNumber: '',
      locationId: defaultLocationId || '',
      latitude: 0,
      longitude: 0,
    },
  });

  useEffect(() => {
    if (open && defaultLocationId) {
      form.setValue('locationId', defaultLocationId);
    }
  }, [open, defaultLocationId, form]);

  const handleSubmitForm = (formData: CreateStationFormData) => {
    onSubmit({
      ...formData,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm trạm cứu trợ mới</DialogTitle>
          <DialogDescription>
            Điền thông tin chi tiết để tạo một trạm mới trong khu vực quản lý.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="add-station-form"
            onSubmit={form.handleSubmit(handleSubmitForm)}
            className="space-y-4"
          >
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
                          placeholder={isLoadingProvinces ? 'Đang tải...' : 'Chọn Tỉnh/Thành phố'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {provinces?.map((province) => (
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
              name="address"
              rules={{ required: 'Vui lòng nhập địa chỉ' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Địa chỉ <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Vd: 123 Đường Nam Kỳ Khởi Nghĩa..." {...field} />
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
                    <Input placeholder="Vd: 0912345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
                      <Input type="number" step="0.000001" placeholder="Vd: 10.762622" {...field} />
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
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="add-station-form">
            Tạo trạm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
