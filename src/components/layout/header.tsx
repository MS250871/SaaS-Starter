// components/header.tsx
import { Navbar } from './navbar';
import { getUserSession } from '@/lib/auth/auth-cookies';

export async function Header() {
  const session = await getUserSession(); // Replace with actual session fetching logic

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b">
      <Navbar sessionId={session} />
    </header>
  );
}
