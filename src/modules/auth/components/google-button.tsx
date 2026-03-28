import { Button } from '@/components/ui/button';
import Image from 'next/image';

type GoogleButtonProps = {
  message?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onClick?: () => void | Promise<void>;
};

export function GoogleButton({
  message = 'Continue with Google',
  size = 'sm',
  className,
  onClick,
}: GoogleButtonProps) {
  return (
    <Button
      variant="outline"
      type="button"
      size={size}
      className={className}
      onClick={onClick}
    >
      <Image src="/google.png" alt="Google Icon" width={16} height={16} />
      {message}
    </Button>
  );
}
