// app/(auth)/post-login/page.tsx

import { postLoginAction } from '@/modules/auth/actions';

export default async function PostLoginPage() {
  await postLoginAction();

  return null; // never renders (always redirects)
}
