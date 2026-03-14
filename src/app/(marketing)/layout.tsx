// app/layout.tsx
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { FooterServer } from '@/components/layout/footer-server';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <FooterServer />
    </>
  );
}
