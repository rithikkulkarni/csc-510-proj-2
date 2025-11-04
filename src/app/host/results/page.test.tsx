// src/app/host/results/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

// Import the page and the named export we want to assert
import ResultsPage, { dynamic } from './page';

// Mock the child component ResultsPageClient to render immediately (no suspension)
vi.mock('./ResultsPageClient', () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="mock-client">Client Loaded</div>),
}));

describe('ResultsPage', () => {
  it(`
  JUSTIFICATION: Renders the page and includes the child inside Suspense.
  Since the child does not suspend in tests, the fallback isn't shown; we assert the child.
  `, () => {
    render(<ResultsPage />);

    // Child renders immediately (no suspension)
    expect(screen.getByTestId('mock-client')).toBeInTheDocument();

    // Fallback is not expected because the child didn't suspend
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it(`
  JUSTIFICATION: Confirms the dynamic export disables static prerender.
  Covers the configuration line.
  `, () => {
    expect(dynamic).toBe('force-dynamic');
  });
});
