'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useSyncExternalStore } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="border-muted-foreground/20 text-accent hover:bg-accent/10 hover:text-accent"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </Button>
  );
}
