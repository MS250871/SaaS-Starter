'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { navItems } from '@/lib/nav/navigation.config';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AuthButtons } from './auth-buttons';

export function MobileMenu({
  open,
  setOpen,
  isLoggedIn,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  isLoggedIn: boolean;
}) {
  return (
    <>
      {/* overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      {/* drawer */}
      <div
        className={cn(
          'fixed left-0 top-0 h-screen w-[80%] max-w-xs bg-background border-r shadow-xl z-50 transform transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-semibold">SAAS LOGO</span>

          <button onClick={() => setOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-col gap-4 p-6 text-lg">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-6 space-y-3">
          <AuthButtons
            className="w-full justify-start"
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </>
  );
}
