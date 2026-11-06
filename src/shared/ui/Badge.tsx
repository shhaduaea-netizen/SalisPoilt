import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  info: 'bg-accent-50 text-accent-700 ring-accent-100',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  error: 'bg-error-50 text-error-700 ring-error-100',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  );
}
