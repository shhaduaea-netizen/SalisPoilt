import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';

export function SectionPlaceholderPage({ sectionKey }: { sectionKey: string }) {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t(`sections.${sectionKey}.title`)} description={t(`sections.${sectionKey}.description`)} />
      <Card className="mt-8 flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
          <Construction className="h-7 w-7" aria-hidden="true" />
        </span>
        <Badge tone="info">{t('placeholder.badge')}</Badge>
        <p className="max-w-md text-sm text-neutral-600">{t('placeholder.body')}</p>
      </Card>
    </>
  );
}
