// src/components/BackButton.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BackButton } from './BackButton';

describe('BackButton', () => {
  it('renders the Return Home link', () => {
    render(<BackButton />);
    const link = screen.getByRole('link', { name: /return home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('applies custom className when provided', () => {
    render(<BackButton className="custom-class" />);
    const link = screen.getByRole('link', { name: /return home/i });
    expect(link).toHaveClass('custom-class');
  });
});
