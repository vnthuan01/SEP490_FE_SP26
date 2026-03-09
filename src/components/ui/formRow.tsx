import * as React from 'react';

export function FormRow({
  icon,
  label,
  description,
  children,
  className = '',
}: {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>

      <div className="flex flex-col w-full gap-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>

          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
