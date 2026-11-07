import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Field, inputClass } from '@/shared/ui/Field';
import { PASSWORD_PATTERN } from '@/shared/auth/passwordPolicy';
import { completePasswordReset, RosterError } from '@/features/roster/rosterApi';
import type { StoredPasswordRequest } from '@/features/auth/passwordRequestStorage';

const schema = z
  .object({
    password: z.string().regex(PASSWORD_PATTERN),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { path: ['confirm'] });

type ApprovedResetValues = z.infer<typeof schema>;

type ApprovedResetFailure = 'notApproved' | 'unknown';

export function ApprovedPasswordResetForm({
  request,
  onComplete,
}: {
  request: StoredPasswordRequest;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const [failure, setFailure] = useState<ApprovedResetFailure | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApprovedResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (values: ApprovedResetValues) => {
    setFailure(null);
    try {
      await completePasswordReset(request.email, request.token, values.password);
      setDone(true);
    } catch (error) {
      const notApproved = error instanceof RosterError && (error.code === 'request_not_approved' || error.status === 409);
      setFailure(notApproved ? 'notApproved' : 'unknown');
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="rounded-lg bg-success-50 px-3 py-3 text-sm text-success-700">
          {t('auth.reset.success')}
        </p>
        <Button onClick={onComplete} className="w-full">
          {t('auth.reset.backToSignIn')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
        {t('auth.reset.approved')}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <Field
          id="approved-new-password"
          label={t('auth.changePassword.newPassword')}
          hint={t('auth.changePassword.hint')}
          error={errors.password && t('auth.errors.passwordInvalid')}
        >
          <input
            id="approved-new-password"
            type="password"
            autoComplete="new-password"
            dir="ltr"
            className={inputClass}
            {...register('password')}
          />
        </Field>
        <Field
          id="approved-confirm-password"
          label={t('auth.changePassword.confirmPassword')}
          error={errors.confirm && t('auth.errors.passwordMismatch')}
        >
          <input
            id="approved-confirm-password"
            type="password"
            autoComplete="new-password"
            dir="ltr"
            className={inputClass}
            {...register('confirm')}
          />
        </Field>
        {failure && (
          <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
            {failure === 'notApproved' ? t('auth.reset.notApproved') : t('auth.errors.generic')}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('auth.reset.submitting') : t('auth.reset.submit')}
        </Button>
      </form>
      <Button variant="ghost" onClick={onComplete} className="w-full">
        {t('auth.forgot.back')}
      </Button>
    </div>
  );
}
