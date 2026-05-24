import Link from 'next/link';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { navItems } from '@/lib/nav/navigation.config';
import { AuthButtons } from './auth-buttons';
import { LinkPendingHint } from './link-pending-hint';
import { Logo } from './logo';

export function Footer({
  isLoggedIn = false,
  dashboardHref = '/app',
}: {
  isLoggedIn?: boolean;
  dashboardHref?: string;
}) {
  return (
    <footer className="mt-24 border-t bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.35fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              A multi-tenant SaaS starter with platform admin, workspace admin,
              customer support, catalog, billing, routing, and governance
              already built in.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>

            <ul className="space-y-2 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <span>{item.name}</span>
                    <LinkPendingHint />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 hover:text-foreground"
                >
                  <span>Privacy</span>
                  <LinkPendingHint />
                </Link>
              </li>

              <li>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-2 hover:text-foreground"
                >
                  <span>Terms</span>
                  <LinkPendingHint />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            Copyright {new Date().getFullYear()} NimbleStack. All rights
            reserved.
          </p>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <AuthButtons
              isLoggedIn={isLoggedIn}
              className="hidden md:flex"
              dashboardHref={dashboardHref}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
