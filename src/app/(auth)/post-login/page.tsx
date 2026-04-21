// app/(auth)/post-login/page.tsx

import { postLoginAction } from '@/modules/auth/actions/post-login.action';

export default async function PostLoginPage() {
  await postLoginAction();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 text-center">
        <p className="text-sm font-medium">Continuing sign in...</p>
      </div>
    </div>
  );
}
