import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser, useDemoPersonas, useSwitchDemoPersona } from '@/data/queries';

/** Developer-only preview of each role. Rendered only when SHOW_DEMO_ROLE_SWITCHER is on. */
export function DemoRoleSwitcherItems() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: personas = [] } = useDemoPersonas();
  const switchPersona = useSwitchDemoPersona();

  return (
    <DropdownMenu.Group>
      <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-medium text-neutral-500">
        {t('roleSwitcher.label')}
      </DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={user?.id ?? ''} onValueChange={(id) => switchPersona.mutate(id)}>
        {personas.map((persona) => (
          <DropdownMenu.RadioItem
            key={persona.id}
            value={persona.id}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm text-primary-900 outline-none data-[highlighted]:bg-neutral-100"
          >
            {t(`roles.${persona.role}`)}
            <DropdownMenu.ItemIndicator>
              <Check className="h-4 w-4 text-accent-700" aria-hidden="true" />
            </DropdownMenu.ItemIndicator>
          </DropdownMenu.RadioItem>
        ))}
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>
  );
}
