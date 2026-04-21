'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';

import { Logo } from './logo';
import { Navigation } from './navigation';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { MobileMenu } from './mobile-menu';
import { AuthButtons } from './auth-buttons';

export function Navbar({ sessionId }: { sessionId?: string }) {
  const [open, setOpen] = useState(false);
  const isLoggedIn = !!sessionId;

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex h-16 items-center justify-between">
        {/* Logo */}
        <Logo />

        {/* Desktop Navigation */}
        <div className="hidden lg:block">
          <Navigation />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <div className="hidden lg:flex items-center gap-3">
            <AuthButtons isLoggedIn={isLoggedIn} />
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <MobileMenu open={open} setOpen={setOpen} isLoggedIn={isLoggedIn} />
    </div>
  );
}
