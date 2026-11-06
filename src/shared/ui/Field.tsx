import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export const inputClass =
  'block w-full min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-primary-900 placeholder:text-neutral-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:bg-neutral-100 disabled:text-neutral-600 sm:min-h-10';

export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-primary-900">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-error-700">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-neutral-600">{hint}</p>
      )}
    </div>
  );
}
