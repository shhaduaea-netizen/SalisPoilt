import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-primary-900/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className={`fixed inset-x-4 top-1/2 z-50 max-h-[90dvh] -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus:outline-none sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 ${
            size === 'lg' ? 'sm:w-[min(48rem,calc(100vw-3rem))]' : 'sm:w-[min(32rem,calc(100vw-3rem))]'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-primary-900">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-neutral-600">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={t('common.close')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="mt-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
