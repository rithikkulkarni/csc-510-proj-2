import { metadata } from './layout';

// This test just verifies metadata and that the layout exports a function
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
