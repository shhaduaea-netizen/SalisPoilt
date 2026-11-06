import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Field, inputClass } from '@/shared/ui/Field';
import { firebaseErrorCode } from '@/shared/auth/firebase';
import { useAuth } from '@/features/auth/useAuth';

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

type LoginValues = z.infer<typeof schema>;

type SignInFailure = 'invalidCredentials' | 'tooManyAttempts' | 'network' | 'unknown';

function signInFailure(error: unknown): SignInFailure {
  switch (firebaseErrorCode(error)) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'invalidCredentials';
    case 'auth/too-many-requests':
      return 'tooManyAttempts';
    case 'auth/network-request-failed':
      return 'network';
    default:
      return 'unknown';
  }
}

export function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [failure, setFailure] = useState<SignInFailure | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setFailure(null);
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      setFailure(signInFailure(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Field id="login-email" label={t('auth.signIn.email')} error={errors.email && t('auth.errors.emailInvalid')}>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          dir="ltr"
          className={inputClass}
          {...register('email')}
        />
      </Field>
      <Field id="login-password" label={t('auth.signIn.password')} error={errors.password && t('auth.errors.passwordRequired')}>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          className={inputClass}
          {...register('password')}
        />
      </Field>
      {failure && (
        <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
          {t(`auth.errors.${failure}`)}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
      </Button>
      <Button variant="ghost" size="sm" onClick={onForgotPassword} className="self-end">
        {t('auth.signIn.forgot')}
      </Button>
    </form>
  );
}
