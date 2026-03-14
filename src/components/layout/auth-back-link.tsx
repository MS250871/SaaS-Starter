'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthBackLink() {
  return (
    <Link
      href="/"
      className="absolute left-4 top-4 flex items-center gap-2 text-sm text-foreground hover:text-foreground capitalize"
    >
      <ArrowLeft className="h-4 w-4" />
      Home
    </Link>
  );
}
