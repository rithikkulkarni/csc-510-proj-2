// src/app/host/swipe/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Ensure a clean module graph between tests since we'll remock ./SwipePage differently
afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.clearAllMocks();
});

/**
 * Justification:
 * This test covers the Suspense fallback branch by mocking SwipePage to "suspend"
 * (throw a never-resolving promise). This directly exercises the fallback JSX,
 * which is otherwise unreachable when the child resolves immediately.
 */
it('shows the loading fallback while SwipePage is suspended', async () => {
  // Mock SwipePage to suspend forever
  vi.doMock('./SwipePage', () => {
    const pending = new Promise(() => {}); // never resolves
    const Suspender = () => {
      throw pending;
    };
    return { __esModule: true, default: Suspender };
  });

  const { default: Page } = await import('./page');

  render(<Page />);

  expect(screen.getByText(/Loading session\.\.\./i)).toBeInTheDocument();
});

/**
 * Justification:
 * This test covers the non-fallback branch by mocking SwipePage to render content
 * immediately. It verifies that the child is rendered and the fallback is *not* shown,
 * ensuring both code paths of the Suspense tree are exercised for line coverage.
 */
it('renders SwipePage content when not suspended', async () => {
  // Mock SwipePage to render immediately
  vi.doMock('./SwipePage', () => ({
    __esModule: true,
    default: () => <div>SwipePage content</div>,
  }));

  const { default: Page } = await import('./page');

  render(<Page />);

  expect(screen.getByText('SwipePage content')).toBeInTheDocument();
  expect(screen.queryByText(/Loading session\.\.\./i)).not.toBeInTheDocument();
});
