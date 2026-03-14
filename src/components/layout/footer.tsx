import Link from 'next/link';
import { Logo } from './logo';
import { navItems } from '@/lib/nav/navigation.config';
import { AuthButtons } from './auth-buttons';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function Footer({ sessionId }: { sessionId?: string }) {
  const isLoggedIn = !!sessionId;
  return (
    <footer className="border-t bg-muted/20 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Top Grid */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-xs">
              A modern multi-tenant SaaS platform starter with built-in
              authentication, theming and scalable architecture.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Product</h4>

            <ul className="space-y-2 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Legal</h4>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>

              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NimbleStack. All rights reserved.
          </p>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <AuthButtons isLoggedIn={isLoggedIn} className="hidden md:flex" />
          </div>
        </div>
      </div>
    </footer>
  );
}
