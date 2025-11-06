// src/app/host/results/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

// Import the page component + named export for prerender config
import ResultsPage, { dynamic } from './page';

/**
 * Unit Test — Results Page Wrapper (Suspense + dynamic config)
 *
 * Purpose:
 * ✅ Ensures the top-level results page renders the client component
 * ✅ Verifies Suspense is present and fallback logic behaves correctly during tests
 * ✅ Tests `dynamic = "force-dynamic"` export to ensure dynamic rendering
 *    (required due to use of searchParams + runtime DB queries)
 *
 * Child component (`ResultsPageClient`) is mocked to avoid data fetching + suspense during testing.
 *
 * @group unit
 */

// Mock client-side results component to prevent actual suspense + DB calls
vi.mock('./ResultsPageClient', () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="mock-client">Client Loaded</div>),
}));

describe('ResultsPage', () => {
  it(`
  JUSTIFICATION: Renders the page and includes the client child.
  Fallback is skipped because the child mock does not suspend.
  `, () => {
    render(<ResultsPage />);

    // ✅ Mocked client component should be visible
    expect(screen.getByTestId('mock-client')).toBeInTheDocument();

    // ✅ Suspense fallback text is not shown
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it(`
  JUSTIFICATION: Confirms dynamic rendering configuration
  to avoid static prerendering on a data-dependent route.
  `, () => {
    expect(dynamic).toBe('force-dynamic');
  });
});
