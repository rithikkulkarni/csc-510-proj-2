// src/components/BackButton.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { BackButton } from './BackButton';

// 1) Mock lucide-react (icon)
vi.mock('lucide-react', () => ({
  ArrowLeft: (props: any) => <svg data-testid="arrow-left" {...props} />,
}));

// 2) Mock your UI Button -> plain <button>
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button data-testid="mock-button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

// 3) Mock next/navigation with a spy-able useRouter
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(), // we'll control its return value in each test
}));

// Import AFTER mocks so it gets the mocked version
import { useRouter } from 'next/navigation';

afterEach(() => {
  vi.clearAllMocks();
});

describe('BackButton', () => {
  it('renders with text and icon', () => {
    // give useRouter *some* shape so component can render
    vi.mocked(useRouter).mockReturnValue({ back: vi.fn() } as any);

    render(<BackButton />);
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-left')).toBeInTheDocument();
  });

  it('calls router.back() when clicked', () => {
    const back = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ back } as any);

    render(<BackButton />);
    fireEvent.click(screen.getByTestId('mock-button'));
    expect(back).toHaveBeenCalledTimes(1);
  });
});