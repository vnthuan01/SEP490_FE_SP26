import * as React from 'react';
export function ReliefFilterBar({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`sticky top-0 z-10 mb-4 border-b border-border bg-card pb-3 ${className}`}>
      {children}
    </div>
  );
}
