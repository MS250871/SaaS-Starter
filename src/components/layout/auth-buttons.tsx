'use client';

import Link from 'next/link';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export function AuthButtons({
  isLoggedIn,
  className,
}: {
  isLoggedIn?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {isLoggedIn ? (
        <>
          <Link href="/dashboard" aria-label="Open dashboard">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        </>
      ) : (
        <>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Login
            </Button>
          </Link>

          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </>
      )}
    </div>
  );
}
