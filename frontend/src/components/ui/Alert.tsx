import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Tone = 'info' | 'destructive' | 'success';
const TONES: Record<Tone, string> = {
  info: 'border-border bg-muted text-foreground',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success/10 text-success',
};

export function Alert({ tone = 'info', className, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return <div className={cn('rounded-md border px-4 py-3 text-sm', TONES[tone], className)} {...props} />;
}
