import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type SpinnerButtonProps = {
  message?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
};

export function SpinnerButton({
  message = 'Submitting...',
  size = 'sm',
  className,
}: SpinnerButtonProps) {
  return (
    <Button disabled size={size} className={className}>
      <Spinner data-icon="inline-start" />
      {message}
    </Button>
  );
}
