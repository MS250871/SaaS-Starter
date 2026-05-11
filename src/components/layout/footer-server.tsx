// components/header.tsx
import { Footer } from './footer';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { resolveDashboardHref } from './dashboard-href';

export async function FooterServer() {
  const session = await getUserSession();
  const dashboardHref = await resolveDashboardHref(session);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b">
      <Footer isLoggedIn={!!session} dashboardHref={dashboardHref} />
    </header>
  );
}
