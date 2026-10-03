import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';

describe('Button', () => {
  it('renders children and responds to clicks', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables itself and shows a spinner while loading', () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByText('Save').closest('button')).toBeDisabled();
  });
});
