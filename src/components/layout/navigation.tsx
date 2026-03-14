'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';

import { navItems } from '@/lib/nav/navigation.config';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <NavigationMenuItem key={item.name}>
              <NavigationMenuLink
                asChild
                className={cn(
                  'px-4 py-2 text-sm rounded-md transition-colors',
                  active ? 'bg-accent text-foreground' : 'hover:bg-accent',
                )}
              >
                <Link href={item.href}>{item.name}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
