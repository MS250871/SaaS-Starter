import { VerifyForm } from '@/modules/auth/components/verify-form';
import type { Mode } from '@/modules/auth/types';

async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const mode = (resolvedSearchParams.mode as Mode) || 'email';
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm mt-6">
        <VerifyForm mode={mode} />
      </div>
    </div>
  );
}

export default VerifyOtpPage;
