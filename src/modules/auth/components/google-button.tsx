import { Button } from '@/components/ui/button';
import Image from 'next/image';

type GoogleButtonProps = {
  message?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  formAction?: (formData: FormData) => void;
};

export function GoogleButton({
  message = 'Continue with Google',
  size = 'sm',
  className,
  formAction,
}: GoogleButtonProps) {
  return (
    <Button
      variant="outline"
      type="submit"
      size={size}
      className={className}
      formAction={formAction}
    >
      <Image src="/google.png" alt="Google Icon" width={16} height={16} />
      {message}
    </Button>
  );
}
