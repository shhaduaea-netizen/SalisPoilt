import { NavLink } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVisibleNavItems } from '@/app/layouts/useVisibleNavItems';
import { usePreferences } from '@/shared/stores/preferences';
import { cn } from '@/shared/utils/cn';

export function Sidebar() {
  const { t } = useTranslation();
  const items = useVisibleNavItems();
  const collapsed = usePreferences((state) => state.sidebarCollapsed);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col bg-primary-900 text-white transition-[width] duration-200 lg:flex',
        collapsed ? 'lg:w-20' : 'lg:w-64'
      )}
    >
      <div className={cn('flex h-16 items-center gap-3 px-5', collapsed && 'justify-center px-0')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500">
          <Compass className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        {!collapsed && <span className="text-base font-semibold">{t('app.name')}</span>}
      </div>

      <nav aria-label={t('nav.primary')} className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const label = t(`nav.${item.key}`);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <NavLink
                  to={item.path}
                  end
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{label}</span>}
                  {collapsed && <span className="sr-only">{label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
