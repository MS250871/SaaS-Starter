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

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="whitespace-nowrap">
        <AuthBackLink />
      </div>
      <div className="w-full max-w-sm mt-6 xl:max-w-md">
        <LoginForm intent={intent} />
      </div>
    </div>
  );
}
