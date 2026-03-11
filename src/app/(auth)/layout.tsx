import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col text-foreground bg-primary/30">
      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer (add when ready) */}
    </div>
  );
}
