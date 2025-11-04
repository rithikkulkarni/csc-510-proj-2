// src/app/host/location/parts/LeafletMap.test.tsx
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// --- Keep the test environment clean between tests ---
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.resetModules();
});

/**
 * IMPORTANT: stub Leaflet's CSS so Vite doesn't try to run PostCSS on it.
 * This avoids the "Invalid PostCSS Plugin" error when importing the component.
 */
vi.mock('leaflet/dist/leaflet.css', () => ({}), { virtual: true });

// --- Mocks for leaflet & react-leaflet so tests are deterministic in JSDOM ---

// Minimal Leaflet mock: enough for the icon + Marker prototype side-effect.
vi.mock('leaflet', () => {
  const Marker = function Marker() {} as any;
  Marker.prototype = { options: {} };

  const icon = vi.fn(() => ({ __icon: true }));

  return {
    default: { icon, Marker },
    icon,
    Marker,
  };
});

// We'll capture map.setView and the latest map event handlers here
let setViewMock: ReturnType<typeof vi.fn>;
let lastMapEventHandlers: Record<string, (e: any) => void> | null = null;

// Mock react-leaflet primitives to simple DOM elements we can assert on.
// Also implement useMap/useMapEvents behavior for our tests.
vi.mock('react-leaflet', () => {
  setViewMock = vi.fn();
  return {
    MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
    TileLayer: ({ url, attribution }: any) => (
      <div data-testid="tile-layer" data-url={url} data-attrib={attribution} />
    ),
    Marker: ({ position }: any) => (
      <div data-testid="marker" data-lat={position?.[0]} data-lng={position?.[1]} />
    ),
    Circle: ({ center, radius, pathOptions }: any) => (
      <div
        data-testid="circle"
        data-lat={center?.[0]}
        data-lng={center?.[1]}
        data-radius={radius}
        data-color={pathOptions?.color}
        data-fill={pathOptions?.fillOpacity}
      />
    ),
    useMap: () => ({ setView: setViewMock }),
    useMapEvents: (handlers: any) => {
      lastMapEventHandlers = handlers;
      return null;
    },
  };
});

// Helper to trigger a Leaflet map click via our useMapEvents mock
function triggerMapClick(lat: number, lng: number) {
  if (!lastMapEventHandlers || typeof lastMapEventHandlers.click !== 'function') {
    throw new Error('click handler was not registered on useMapEvents');
  }
  lastMapEventHandlers.click({ latlng: { lat, lng } });
}

describe('LeafletMap', () => {
  it('renders base map and tile layer; with no picked, no marker/circle', async () => {
    const { default: LeafletMap } = await import('./LeafletMap');

    render(<LeafletMap picked={null} onPick={() => {}} />);

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    const tile = screen.getByTestId('tile-layer');
    expect(tile).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
    expect(screen.queryByTestId('circle')).not.toBeInTheDocument();
  });

  it('renders Marker and Circle when picked is provided (with custom radius)', async () => {
    const { default: LeafletMap } = await import('./LeafletMap');

    render(<LeafletMap picked={{ lat: 35.0, lng: -78.0 }} onPick={() => {}} radiusMeters={3210} />);

    const marker = screen.getByTestId('marker');
    const circle = screen.getByTestId('circle');

    expect(marker).toHaveAttribute('data-lat', '35');
    expect(marker).toHaveAttribute('data-lng', '-78');

    expect(circle).toHaveAttribute('data-lat', '35');
    expect(circle).toHaveAttribute('data-lng', '-78');
    expect(circle).toHaveAttribute('data-radius', '3210');
  });

  it('recenters map when picked changes (calls map.setView with zoom 12)', async () => {
    const { default: LeafletMap } = await import('./LeafletMap');

    const { rerender } = render(<LeafletMap picked={null} onPick={() => {}} />);
    expect(setViewMock).not.toHaveBeenCalled();

    rerender(<LeafletMap picked={{ lat: 42.1, lng: -71.2 }} onPick={() => {}} />);
    expect(setViewMock).toHaveBeenCalledTimes(1);
    expect(setViewMock).toHaveBeenCalledWith([42.1, -71.2], 12);
  });

  it('forwards map click to onPick with lat/lng', async () => {
    const { default: LeafletMap } = await import('./LeafletMap');

    const onPick = vi.fn();
    render(<LeafletMap picked={null} onPick={onPick} />);

    triggerMapClick(33.3, -110.5);
    expect(onPick).toHaveBeenCalledWith({ lat: 33.3, lng: -110.5 });
  });
});
