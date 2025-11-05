// src/components/ui/Button.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button, buttonVariants } from './Button';

describe('Button component', () => {
  it('renders with default props', () => {
    const { unmount } = render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass(buttonVariants());
    unmount();
  });

  it('applies variant and size classes correctly', () => {
    const { unmount } = render(
      <Button variant="destructive" size="lg">
        Delete
      </Button>
    );
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass(buttonVariants({ variant: 'destructive', size: 'lg' }));
    unmount();
  });

  it('merges custom className', () => {
    const { unmount } = render(<Button className="my-custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('my-custom-class');
    expect(button).toHaveClass(buttonVariants());
    unmount();
  });

  it('renders as a Slot when asChild is true', () => {
    const { unmount } = render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: /link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass(buttonVariants());
    unmount();
  });

  it('handles onClick events', () => {
    const handleClick = vi.fn();
    const { unmount } = render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole('button', { name: /click/i });
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('renders all supported variants', () => {
    const variants: Parameters<typeof buttonVariants>[0]['variant'][] = [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
    ];

    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>Variant</Button>);
      const button = screen.getByRole('button', { name: /variant/i });
      expect(button).toHaveClass(buttonVariants({ variant }));
      unmount();
    });
  });

  it('renders all supported sizes', () => {
    const sizes: Parameters<typeof buttonVariants>[0]['size'][] = ['default', 'sm', 'lg', 'icon'];

    sizes.forEach((size) => {
      const { unmount } = render(<Button size={size}>Size</Button>);
      const button = screen.getByRole('button', { name: /size/i });
      expect(button).toHaveClass(buttonVariants({ size }));
      unmount();
    });
  });
});
