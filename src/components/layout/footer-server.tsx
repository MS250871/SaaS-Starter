// components/header.tsx
import { Footer } from './footer';
import { getUserSession } from '@/lib/auth/auth-cookies';

export async function FooterServer() {
  const session = await getUserSession();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b">
      <Footer isLoggedIn={!!session} />
    </header>
  );
}
