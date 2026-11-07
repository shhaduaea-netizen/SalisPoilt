import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Field, inputClass } from '@/shared/ui/Field';
import { firebaseErrorCode } from '@/shared/auth/firebase';
import { useAuth } from '@/features/auth/useAuth';
import { ApprovedPasswordResetForm } from '@/features/auth/ApprovedPasswordResetForm';
import {
  clearStoredPasswordRequest,
  readStoredPasswordRequest,
  saveStoredPasswordRequest,
  type StoredPasswordRequest,
} from '@/features/auth/passwordRequestStorage';
import {
  checkPasswordRequestByEmail,
  requestPasswordByEmail,
  type PasswordResetStatus,
} from '@/features/roster/rosterApi';

const POLL_INTERVAL_MS = 5000;

const schema = z.object({
  email: z.string().trim().email(),
});

type ForgotPasswordValues = z.infer<typeof schema>;

type ResetStatus = 'idle' | 'sent' | 'pending' | 'rejected' | 'expired' | 'network' | 'unknown';

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { sendPasswordReset } = useAuth();
  const [status, setStatus] = useState<ResetStatus>('idle');
  const [checking, setChecking] = useState(false);
  const [waiting, setWaiting] = useState<StoredPasswordRequest | null>(null);
  const [approved, setApproved] = useState<StoredPasswordRequest | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const applyStatus = useCallback((request: StoredPasswordRequest, result: PasswordResetStatus['status']) => {
    setValue('email', request.email);
    if (result === 'approved') {
      setApproved(request);
      setWaiting(null);
      setStatus('idle');
      return;
    }
    setApproved(null);
    if (result === 'pending') {
      setWaiting(request);
      setStatus('pending');
      return;
    }
    setWaiting(null);
    clearStoredPasswordRequest();
    if (result === 'rejected') setStatus('rejected');
    else if (result === 'expired') setStatus('expired');
    else setStatus('idle');
  }, [setValue]);

  useEffect(() => {
    const stored = readStoredPasswordRequest();
    if (!stored) return;
    let cancelled = false;
    checkPasswordRequestByEmail(stored.email, stored.token)
      .then(({ status: result }) => {
        if (!cancelled) applyStatus(stored, result);
      })
      .catch(() => {
        if (!cancelled) setStatus('unknown');
      });
    return () => {
      cancelled = true;
    };
  }, [applyStatus]);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => {
      checkPasswordRequestByEmail(waiting.email, waiting.token)
        .then(({ status: result }) => applyStatus(waiting, result))
        .catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [waiting, applyStatus]);

  const requestApproval = async () => {
    const parsed = schema.safeParse({ email: getValues('email') });
    if (!parsed.success) {
      await handleSubmit(() => undefined)();
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const stored = readStoredPasswordRequest();
    setStatus('idle');
    setChecking(true);
    try {
      const { requestToken } = await requestPasswordByEmail(email, stored?.email === email ? stored.token : null);
      const request = { email, token: requestToken };
      saveStoredPasswordRequest(request);
      const { status: result } = await checkPasswordRequestByEmail(email, requestToken);
      applyStatus(request, result);
    } catch {
      setStatus('unknown');
    } finally {
      setChecking(false);
    }
  };

  const onSubmit = async (values: ForgotPasswordValues) => {
    setStatus('idle');
    try {
      await sendPasswordReset(values.email);
      setStatus('sent');
    } catch (error) {
      const code = firebaseErrorCode(error);
      if (code === 'auth/user-not-found') setStatus('sent');
      else if (code === 'auth/network-request-failed') setStatus('network');
      else setStatus('unknown');
    }
  };

  if (approved) {
    return (
      <ApprovedPasswordResetForm
        request={approved}
        onComplete={() => {
          clearStoredPasswordRequest();
          setApproved(null);
          onBack();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <Field
          id="reset-email"
          label={t('auth.signIn.email')}
          error={errors.email && t('auth.errors.emailInvalid')}
        >
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            dir="ltr"
            className={inputClass}
            {...register('email')}
          />
        </Field>
        {status === 'sent' && (
          <p role="status" className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
            {t('auth.forgot.sent')}
          </p>
        )}
        {status === 'pending' && (
          <p role="status" className="rounded-lg bg-warning-50 px-3 py-3 text-sm text-warning-700">
            {t('auth.forgot.pending')}
          </p>
        )}
        {status === 'rejected' && (
          <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
            {t('auth.forgot.rejected')}
          </p>
        )}
        {status === 'expired' && (
          <p role="alert" className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700">
            {t('auth.forgot.expired')}
          </p>
        )}
        {(status === 'network' || status === 'unknown') && (
          <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
            {t(`auth.errors.${status}`)}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="submit" disabled={isSubmitting || checking} className="w-full">
            {isSubmitting ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void requestApproval()} disabled={isSubmitting || checking} className="w-full">
            {checking ? t('common.loading') : t('auth.forgot.requestApproval')}
          </Button>
        </div>
      </form>
      <Button variant="ghost" onClick={onBack} className="w-full">
        {t('auth.forgot.back')}
      </Button>
    </div>
  );
}
