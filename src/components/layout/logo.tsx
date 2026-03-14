import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center">
      {/* Light logo */}
      <Image
        src="/logo-light.svg"
        alt="Logo"
        width={160}
        height={40}
        className="block dark:hidden"
      />

      {/* Dark logo */}
      <Image
        src="/logo-dark.svg"
        alt="Logo"
        width={160}
        height={40}
        className="hidden dark:block"
      />
    </div>
  );
}
