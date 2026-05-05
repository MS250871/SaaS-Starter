import AuthBackLink from '@/components/layout/auth-back-link';
import { SignupForm } from '@/modules/auth/components/signup-form';
import type { AuthCookies } from '@/lib/auth/auth.schema';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const intent =
    (resolvedSearchParams.intent as AuthCookies['intent']) || 'free';
  const invite = resolvedSearchParams.invite as string | undefined;
  const entry =
    (resolvedSearchParams.entry as AuthCookies['entry']) || 'platform';
  const planKey = resolvedSearchParams.plan as string | undefined;
  const planName = resolvedSearchParams.planName as string | undefined;
  const message =
    resolvedSearchParams.expired === 'verification'
      ? 'Your verification session expired. Please continue signup again to receive a fresh code.'
      : undefined;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <AuthBackLink />
      <div className="w-full max-w-sm mt-6 xl:max-w-md">
        <SignupForm
          intent={intent}
          invite={invite}
          entry={entry}
          planKey={planKey}
          planName={planName}
          message={message}
        />
      </div>
    </div>
  );
}
