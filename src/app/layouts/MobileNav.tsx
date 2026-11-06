import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { NavLink } from 'react-router-dom';
import { MoreHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVisibleNavItems } from '@/app/layouts/useVisibleNavItems';
import { cn } from '@/shared/utils/cn';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
    isActive ? 'bg-accent-50 text-accent-700' : 'text-primary-900 hover:bg-neutral-100'
  );

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500',
    isActive ? 'text-accent-700' : 'text-neutral-600'
  );

export function MobileNav() {
  const { t } = useTranslation();
  const items = useVisibleNavItems();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.filter((item) => item.mobilePrimary);

  return (
    <>
      <nav
        aria-label={t('nav.primary')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur lg:hidden"
      >
        <ul className="grid grid-flow-col auto-cols-fr">
          {primary.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <NavLink to={item.path} end className={tabClass}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{t(`nav.${item.key}`)}</span>
                </NavLink>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMoreOpen(true)} className={tabClass({ isActive: false })}>
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              <span>{t('common.more')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-primary-900/40 lg:hidden" />
          <Dialog.Content className="animate-sheet-up fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-6 shadow-xl focus:outline-none lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold text-primary-900">{t('common.more')}</Dialog.Title>
              <Dialog.Close className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500">
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{t('common.close')}</span>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">{t('nav.primary')}</Dialog.Description>
            <ul className="flex flex-col gap-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <NavLink to={item.path} end className={linkClass} onClick={() => setMoreOpen(false)}>
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>{t(`nav.${item.key}`)}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
