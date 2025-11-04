// src/app/host/confirm/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

// Import default and named export to cover both lines
import ConfirmPage, { dynamic } from './page';

// Mock the child so it doesn't suspend (fallback wouldn't appear)
vi.mock('./ConfirmPageClient', () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="mock-confirm-client">Confirm Client Loaded</div>),
}));

describe('ConfirmPage (app/host/confirm/page.tsx)', () => {
  it(`
  JUSTIFICATION: Renders page with Suspense boundary and child content.
  Child does not suspend in test, so fallback should not be present.
  `, () => {
    render(<ConfirmPage />);

    // Child is rendered
    expect(screen.getByTestId('mock-confirm-client')).toBeInTheDocument();

    // Fallback should not appear because the child didn't suspend
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it(`
  JUSTIFICATION: Asserts dynamic export is set to 'force-dynamic' to disable prerendering.
  `, () => {
    expect(dynamic).toBe('force-dynamic');
  });
});
