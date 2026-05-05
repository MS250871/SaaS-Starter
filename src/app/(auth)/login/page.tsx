import AuthBackLink from '@/components/layout/auth-back-link';
import { LoginForm } from '@/modules/auth/components/login-form';
import type { AuthCookies } from '@/lib/auth/auth.schema';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const intent =
    (resolvedSearchParams.intent as AuthCookies['intent']) || 'free';
  const message =
    resolvedSearchParams.expired === 'verification'
      ? 'Your verification session expired. Please continue again to receive a fresh code.'
      : undefined;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="whitespace-nowrap">
        <AuthBackLink />
      </div>
      <div className="w-full max-w-sm mt-6 xl:max-w-md">
        <LoginForm intent={intent} message={message} />
      </div>
    </div>
  );
}
