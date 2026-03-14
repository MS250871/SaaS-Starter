export type NavItem = {
  name: string;
  href: string;
  external?: boolean;
  anchor?: boolean;
  children?: NavItem[];
};

export const navItems = [
  { name: 'Home', href: '/' },
  { name: 'How it Works', href: '/#how-it-works', anchor: true },
  { name: 'Pricing', href: '/pricing' },
] satisfies NavItem[];
