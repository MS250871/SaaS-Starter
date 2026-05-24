export type NavItem = {
  name: string;
  href: string;
  external?: boolean;
  anchor?: boolean;
  children?: NavItem[];
};

export const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Capabilities', href: '/#capabilities', anchor: true },
  { name: 'Screens', href: '/#screens', anchor: true },
  { name: 'Architecture', href: '/#architecture', anchor: true },
  { name: 'Pricing Example', href: '/pricing' },
] satisfies NavItem[];
