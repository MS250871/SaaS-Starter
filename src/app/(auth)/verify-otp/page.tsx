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
    <div>
      <VerifyForm mode={mode} />
    </div>
  );
}

export default VerifyOtpPage;
