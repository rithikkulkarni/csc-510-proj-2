// src/app/host/confirm/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

// Import default component and config export to validate both
import ConfirmPage, { dynamic } from './page';

/**
 * Unit Test — ConfirmPage Wrapper
 *
 * What this protects:
 * ✅ Proper Suspense-based structure is maintained
 * ✅ Child client component loads immediately in tests
 * ✅ Dynamic rendering is enforced (dynamic = "force-dynamic")
 *    due to searchParams usage for session code and expiry
 *
 * Mocking strategy:
 * - The underlying ConfirmPageClient is mocked to avoid
 *   data fetching behavior and React suspense in test environment
 *
 * @group unit
 */

// Client component mock (skips suspense + network)
vi.mock('./ConfirmPageClient', () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="mock-confirm-client">Confirm Client Loaded</div>),
}));

describe('ConfirmPage (app/host/confirm/page.tsx)', () => {
  /**
   * Ensures React tree mounts correctly with the mocked Suspense behavior
   * and that the child content shows immediately without fallback.
   */
  it(`
    JUSTIFICATION: Renders page structure with child content visible.
    No fallback expected because client component doesn’t suspend in tests.
    `, () => {
    render(<ConfirmPage />);

    expect(screen.getByTestId('mock-confirm-client')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  /**
   * Validates Next.js rendering behavior configuration
   */
  it(`
    JUSTIFICATION: Dynamic export must disable prerendering
    to support runtime params + db queries.
    `, () => {
    expect(dynamic).toBe('force-dynamic');
  });
});
