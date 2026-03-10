export function InfoRow({
  icon,
  label,
  value,
  className = '',
}: {
  icon: string;
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>

        <p className="text-sm text-foreground mt-1">
          {value || <span className="text-muted-foreground italic">Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );
}
