import { cn } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-primary', className)} role="status" aria-label="Loading" />;
}
