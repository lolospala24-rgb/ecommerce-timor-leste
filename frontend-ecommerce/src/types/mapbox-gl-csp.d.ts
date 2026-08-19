// @types/mapbox-gl only covers the main 'mapbox-gl' entrypoint — these two
// CSP-specific subpaths (used to avoid 'unsafe-eval' in CSP, see
// components/maps/MapboxPicker.tsx) ship the same runtime API but aren't
// separately typed upstream.
declare module 'mapbox-gl/dist/mapbox-gl-csp' {
  import mapboxgl = require('mapbox-gl');
  const csp: typeof mapboxgl & { workerClass: unknown };
  export = csp;
}

declare module 'mapbox-gl/dist/mapbox-gl-csp-worker' {
  const MapboxWorker: unknown;
  export = MapboxWorker;
}
