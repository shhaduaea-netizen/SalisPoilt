import { useEffect, useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { firebaseErrorCode } from '@/shared/auth/firebase';
import { checkPasswordRequest, updateProfile } from '@/features/roster/rosterApi';
import { useCreatePasswordRequest } from '@/features/roster/useRoster';
import { getBrowserFingerprint } from '@/shared/utils/browserFingerprint';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field, inputClass } from '@/shared/ui/Field';
import { PageHeader } from '@/shared/ui/PageHeader';

export function ProfilePage() {
  const { t } = useTranslation();
  const { state, sendPasswordReset, retry } = useAuth();
  const requestMutation = useCreatePasswordRequest();
  const member = state.status === 'ready' ? state.member : null;
  const [fullNameEn, setFullNameEn] = useState('');
  const [fullNameAr, setFullNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved' | 'resetSent' | 'requestSent' | 'pending' | 'error'>('idle');
  const [saving, setSaving] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (!member) return;
    setFullNameEn(member.fullNameEn);
    setFullNameAr(member.fullNameAr ?? '');
    setPhone(member.phone ?? '');
  }, [member]);

  useEffect(() => {
    if (!member) return;
    const fp = getBrowserFingerprint();
    let cancelled = false;
    void (async () => {
      try {
        const { pending } = await checkPasswordRequest(fp);
        if (!cancelled) setHasPending(pending);
      } catch {
        // ignore — user can still use email option
      }
    })();
    return () => { cancelled = true; };
  }, [member]);

  if (!member) return null;

  const save = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await updateProfile({ fullNameEn: fullNameEn.trim(), fullNameAr: fullNameAr.trim() || null, phone: phone.trim() || null });
      await retry();
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    setStatus('idle');
    try {
      await sendPasswordReset(member.email);
      setStatus('resetSent');
    } catch (error) {
      setStatus(firebaseErrorCode(error) === 'auth/network-request-failed' ? 'error' : 'error');
    }
  };

  const requestReset = async () => {
    setStatus('idle');
    const fp = getBrowserFingerprint();
    try {
      await requestMutation.mutateAsync(fp);
      setHasPending(true);
      setStatus('requestSent');
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : '';
      if (code === 'request_already_pending') {
        setHasPending(true);
        setStatus('pending');
      } else {
        setStatus('error');
      }
    }
  };

  return (
    <>
      <PageHeader title={t('profile.title')} description={t('profile.description')} />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary-900">{t('profile.detailsTitle')}</h2>
          <div className="mt-6 grid gap-5">
            <Field id="profile-name-en" label={t('profile.nameEn')}>
              <input id="profile-name-en" value={fullNameEn} onChange={(event) => setFullNameEn(event.target.value)} className={inputClass} />
            </Field>
            <Field id="profile-name-ar" label={t('profile.nameAr')}>
              <input id="profile-name-ar" value={fullNameAr} onChange={(event) => setFullNameAr(event.target.value)} className={inputClass} dir="rtl" />
            </Field>
            <Field id="profile-phone" label={t('profile.phone')}>
              <input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} dir="ltr" inputMode="tel" />
            </Field>
            {status === 'saved' && <p role="status" className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">{t('profile.saved')}</p>}
            {status === 'error' && <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{t('profile.error')}</p>}
            <Button onClick={() => void save()} disabled={saving} className="w-full sm:w-auto sm:self-start">
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? t('profile.saving') : t('profile.save')}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-primary-900">{t('profile.passwordTitle')}</h2>
          <p className="mt-2 text-sm text-neutral-600">{t('profile.passwordDescription')}</p>
          {hasPending && (
            <p role="status" className="mt-4 rounded-lg bg-warning-50 px-3 py-3 text-sm text-warning-700">
              {t('profile.pendingRequest')}
            </p>
          )}
          {status === 'resetSent' && <p role="status" className="mt-4 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">{t('profile.resetSent')}</p>}
          {status === 'requestSent' && <p role="status" className="mt-4 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">{t('profile.requestSent')}</p>}
          {status === 'error' && <p role="alert" className="mt-4 rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{t('profile.error')}</p>}
          <div className="mt-6 flex flex-col gap-3">
            <Button variant="secondary" onClick={() => void sendReset()} disabled={requestMutation.isPending} className="w-full">
              {t('profile.sendReset')}
            </Button>
            {hasPending ? (
              <p className="rounded-lg bg-neutral-50 px-3 py-3 text-center text-sm text-neutral-600">
                {t('profile.pendingRequest')}
              </p>
            ) : (
              <Button onClick={() => void requestReset()} disabled={requestMutation.isPending} className="w-full">
                {t('profile.requestReset')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
