import { metadata } from './layout';

/**
 * Unit Test — Root Layout Module
 *
 * Confirms that the root layout:
 * - Exports the expected default `metadata` object (SEO + app identity)
 * - Exports a valid React component function as the default export
 *
 * These tests help ensure:
 * - Layout configuration changes don't silently break SEO setup
 * - The layout remains a callable function (React component contract)
 *
 * @group unit
 */
describe('Root layout module', () => {
  it('exports correct metadata', () => {
    expect(metadata).toEqual({
      title: 'Food Finder',
      description: 'Find the best food options near you',
    });
  });

  it('exports a valid layout function', async () => {
    const mod = await import('./layout');
    expect(typeof mod.default).toBe('function');
  });
});
