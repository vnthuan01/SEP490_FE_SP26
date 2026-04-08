export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  originalFilename?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Thiếu cấu hình Cloudinary. Vui lòng thiết lập VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET.',
    );
  }

  return { cloudName, uploadPreset };
}

export async function uploadFileToCloudinary(
  file: File,
  options?: {
    folder?: string;
    resourceType?: 'image' | 'raw' | 'video' | 'auto';
  },
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  const resourceType = options?.resourceType ?? 'image';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  if (options?.folder) {
    formData.append('folder', options.folder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Upload file lên Cloudinary thất bại.');
  }

  const data = await response.json();

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    originalFilename: data.original_filename,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  };
}
