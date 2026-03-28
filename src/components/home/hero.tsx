import { Button } from '@/components/ui/button';
import { GridBackground } from './grid-background';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <GridBackground />

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-6 py-32 text-center pointer-events-none">
        <h1 className="text-5xl font-bold tracking-tight">
          Build Multi-Tenant SaaS
          <br />
          Faster Than Ever
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          A modern SaaS starter with authentication, tenant isolation, dynamic
          theming and scalable architecture built with Next.js and shadcn/ui.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4 pointer-events-auto">
          <Button size="lg" asChild>
            <Link href="/signup?intent=free">Start Free Trial</Link>
          </Button>

          <Button variant="outline" size="lg" asChild>
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
