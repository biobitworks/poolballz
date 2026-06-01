import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function leafletTestMock() {
  return {
    name: 'poolballz-leaflet-test-mock',
    enforce: 'pre',
    resolveId(id) {
      return id === 'leaflet' ? '\0poolballz-leaflet-test-mock' : null;
    },
    load(id) {
      if (id !== '\0poolballz-leaflet-test-mock') return null;
      return `
        function markerChain() {
          const marker = {
            addTo: () => marker,
            bindTooltip: () => marker,
            on: () => marker,
          };
          return marker;
        }

        export function map() {
          return {
            getZoom: () => 12,
            on: () => {},
            remove: () => {},
            setView: () => {},
          };
        }

        export function tileLayer() {
          return { addTo: () => {} };
        }

        export function layerGroup() {
          const layer = {
            addTo: () => layer,
            clearLayers: () => {},
          };
          return layer;
        }

        export function circleMarker() {
          return markerChain();
        }
      `;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'test' ? [leafletTestMock()] : [])],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    globals: true,
    setupFiles: './vitest.setup.js',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
}));
