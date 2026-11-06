import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-neutral-200 bg-white shadow-sm', className)}>{children}</section>
  );
}
