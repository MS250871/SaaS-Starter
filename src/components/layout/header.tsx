// components/header.tsx
import { Navbar } from './navbar';
import { getUserSession } from '@/lib/auth/auth-cookies';
import { resolveDashboardHref } from './dashboard-href';

export async function Header() {
  const session = await getUserSession();
  const dashboardHref = await resolveDashboardHref(session);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b">
      <Navbar isLoggedIn={!!session} dashboardHref={dashboardHref} />
    </header>
  );
}
