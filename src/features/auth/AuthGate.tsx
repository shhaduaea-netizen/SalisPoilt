import { useEffect, useState, type ReactNode } from 'react';
import { Ban, Loader2, Mail, Target, UserX, WifiOff, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { useAuth } from '@/features/auth/useAuth';
import { usePreferences } from '@/shared/stores/preferences';
import { LoginForm } from '@/features/auth/LoginForm';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';
import type { RosterMember } from '@/features/roster/rosterApi';

export function AuthGate({ children }: { children: (member: RosterMember) => ReactNode }) {
  const { t } = useTranslation();
  const { state, retry } = useAuth();
  const setUserId = usePreferences((preferences) => preferences.setUserId);

  useEffect(() => {
    if (state.status === 'ready') setUserId(state.member.id);
  }, [setUserId, state]);
  const [recovering, setRecovering] = useState(false);

  switch (state.status) {
    case 'loading':
      return (
        <AuthShell>
          <div role="status" className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-accent-600" aria-hidden="true" />
            <span className="sr-only">{t('common.loading')}</span>
          </div>
        </AuthShell>
      );
    case 'signedOut':
      if (recovering) {
        return (
          <AuthShell title={t('auth.forgot.title')} description={t('auth.forgot.description')}>
            <ForgotPasswordForm onBack={() => setRecovering(false)} />
          </AuthShell>
        );
      }
      return (
        <AuthShell title={t('auth.signIn.title')} description={t('auth.signIn.description')}>
          <LoginForm onForgotPassword={() => setRecovering(true)} />
        </AuthShell>
      );
    case 'unverified':
      return (
        <AuthShell>
          <VerifyPanel email={state.email} />
        </AuthShell>
      );
    case 'unregistered':
      return (
        <AuthShell>
          <StatusPanel icon={UserX} title={t('auth.unregistered.title')} body={t('auth.unregistered.body')}>
            <SignOutButton />
          </StatusPanel>
        </AuthShell>
      );
    case 'suspended':
      return (
        <AuthShell>
          <StatusPanel icon={Ban} title={t('auth.suspended.title')} body={t('auth.suspended.body')}>
            <SignOutButton />
          </StatusPanel>
        </AuthShell>
      );
    case 'unavailable':
      return (
        <AuthShell>
          <StatusPanel icon={WifiOff} title={t('auth.unavailable.title')} body={t('auth.unavailable.body')}>
            <div className="flex w-full flex-col gap-3">
              <Button onClick={() => void retry()} className="w-full">
                {t('common.retry')}
              </Button>
              <SignOutButton />
            </div>
          </StatusPanel>
        </AuthShell>
      );
    case 'ready':
      if (state.member.mustChangePassword) {
        return (
          <AuthShell title={t('auth.changePassword.title')} description={t('auth.changePassword.description')}>
            <ChangePasswordForm />
          </AuthShell>
        );
      }
      return <>{children(state.member)}</>;
  }
}

function AuthShell({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-900 text-white">
            <Target className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-xl font-semibold text-primary-900">{t('app.name')}</span>
        </div>
        <Card className="p-6 sm:p-8">
          {title && <h1 className="text-2xl font-semibold text-primary-900">{title}</h1>}
          {description && <p className="mt-2 text-sm text-neutral-600">{description}</p>}
          <div className={title ? 'mt-6' : undefined}>{children}</div>
        </Card>
      </div>
    </div>
  );
}

function StatusPanel({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold text-primary-900">{title}</h1>
      <p className="text-sm text-neutral-600">{body}</p>
      <div className="mt-2 w-full">{children}</div>
    </div>
  );
}

function VerifyPanel({ email }: { email: string }) {
  const { t } = useTranslation();
  const { refreshVerification, resendVerification } = useAuth();
  const [notice, setNotice] = useState<'resent' | 'resendFailed' | 'notYet' | 'checkFailed' | null>(null);
  const [busy, setBusy] = useState(false);

  const runAction = async (action: () => Promise<void>, onError: 'resendFailed' | 'checkFailed') => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch {
      setNotice(onError);
    } finally {
      setBusy(false);
    }
  };

  const check = () =>
    runAction(async () => {
      const verified = await refreshVerification();
      if (!verified) setNotice('notYet');
    }, 'checkFailed');

  return (
    <StatusPanel icon={Mail} title={t('auth.verify.title')} body={t('auth.verify.body', { email })}>
      <div className="flex flex-col gap-3">
        {notice && (
          <p
            role="status"
            className={`rounded-lg px-3 py-2 text-sm ${
              notice === 'resent' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
            }`}
          >
            {t(`auth.verify.notices.${notice}`)}
          </p>
        )}
        <Button onClick={() => void check()} disabled={busy} className="w-full">
          {t('auth.verify.check')}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void runAction(async () => { await resendVerification(); setNotice('resent'); }, 'resendFailed')}
          className="w-full"
        >
          {t('auth.verify.resend')}
        </Button>
        <SignOutButton />
      </div>
    </StatusPanel>
  );
}

function SignOutButton() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  return (
    <Button variant="ghost" onClick={() => void signOut()} className="w-full">
      {t('auth.signOut')}
    </Button>
  );
}
