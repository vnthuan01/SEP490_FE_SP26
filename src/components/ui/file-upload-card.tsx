import * as React from 'react';

type FileUploadCardProps = {
  title: string;
  description: string;
  accept: string;
  multiple?: boolean;
  icon?: string;
  className?: string;
  containerClassName?: string;
  previewListClassName?: string;
  previewMediaClassName?: string;
  selectedFiles?: Array<File | { name?: string; size?: number }>;
  onRemoveFile?: (index: number) => void;
  onFilesSelected: (files: FileList | null) => void;
};

export function FileUploadCard({
  title,
  description,
  accept,
  multiple = false,
  icon = 'upload_file',
  className = '',
  containerClassName = '',
  previewListClassName = '',
  previewMediaClassName = '',
  selectedFiles = [],
  onRemoveFile,
  onFilesSelected,
}: FileUploadCardProps) {
  const previewUrls = React.useMemo(
    () =>
      selectedFiles.map((file) => {
        const isNativeFile = typeof File !== 'undefined' && file instanceof File;
        const fileName = file.name?.toLowerCase() || '';
        const fileType = isNativeFile ? file.type : '';
        const isImage =
          fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fileName);
        const isPdf = fileType === 'application/pdf' || /\.pdf$/.test(fileName);

        return {
          file,
          isImage,
          isPdf,
          objectUrl: isNativeFile && (isImage || isPdf) ? URL.createObjectURL(file) : null,
        };
      }),
    [selectedFiles],
  );

  React.useEffect(() => {
    return () => {
      previewUrls.forEach((item) => {
        if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      });
    };
  }, [previewUrls]);

  return (
    <label className={`block cursor-pointer ${className}`}>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          onFilesSelected(event.target.files);
          event.target.value = '';
        }}
      />

      <div
        className={`rounded-2xl border border-dashed border-border bg-muted/10 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 ${containerClassName}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Đã chọn {selectedFiles.length} tệp
            </p>
            <div className={`space-y-2 ${previewListClassName}`}>
              {previewUrls.map(({ file, isImage, isPdf, objectUrl }, index) => (
                <div
                  key={`${file.name || 'file'}-${index}`}
                  className="overflow-hidden rounded-xl bg-background/80"
                >
                  {(isImage || isPdf) && objectUrl ? (
                    <div className="border-b border-border/60 bg-muted/20">
                      {isImage ? (
                        <img
                          src={objectUrl}
                          alt={file.name || `Tệp ${index + 1}`}
                          className={`h-40 w-full object-cover ${previewMediaClassName}`}
                        />
                      ) : (
                        <iframe
                          src={objectUrl}
                          title={file.name || `PDF ${index + 1}`}
                          className={`h-48 w-full border-0 bg-background ${previewMediaClassName}`}
                        />
                      )}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.name || `Tệp ${index + 1}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {typeof file.size === 'number' && (
                          <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                        )}
                        {isImage && <span>Ảnh xem trước</span>}
                        {isPdf && <span>PDF xem trước</span>}
                      </div>
                    </div>
                    {onRemoveFile ? (
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onRemoveFile(index);
                        }}
                        aria-label={`Xóa ${file.name || `tệp ${index + 1}`}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    ) : (
                      <span className="material-symbols-outlined text-[18px] text-muted-foreground">
                        attach_file
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
