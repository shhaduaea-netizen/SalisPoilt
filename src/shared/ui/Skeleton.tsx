import { cn } from '@/shared/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-neutral-200/80', className)} />;
}
