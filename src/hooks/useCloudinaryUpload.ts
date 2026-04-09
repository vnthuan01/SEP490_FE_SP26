import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadFileToCloudinary } from '@/lib/cloudinary';
import { handleHookError } from './hookErrorUtils';

export function useCloudinaryUpload() {
  const mutation = useMutation({
    mutationFn: ({
      file,
      folder,
      resourceType,
    }: {
      file: File;
      folder?: string;
      resourceType?: 'image' | 'raw' | 'video' | 'auto';
    }) => uploadFileToCloudinary(file, { folder, resourceType }),
    onError: (error) => {
      handleHookError(error, 'Không thể tải file lên Cloudinary');
    },
  });

  return {
    uploadFile: mutation.mutateAsync,
    uploadStatus: mutation.status,
    isUploading: mutation.status === 'pending',
    resetUpload: mutation.reset,
    uploadSuccessToast: () => toast.success('Tải file lên Cloudinary thành công'),
  };
}
