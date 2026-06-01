# Hardcoded Path Audit

Audit date: 2026-05-31

## Result

No source files require a developer-specific absolute local machine path.

## Expected Fixed Values

These values are intentional:

- `http://localhost:5173` in Playwright/Vitest config for local tests.
- `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` for Leaflet map tiles.
- `https://nominatim.openstreetmap.org/search` for user-triggered venue lookup.
- `poolballz.venues.v2` as the localStorage key.
- Seed venue coordinates and OpenStreetMap URLs in `src/venues.js`.

## Ignored Local Outputs

The repository ignores machine-generated and local-only files:

- `node_modules/`
- `dist/`
- `artifacts/`
- `test-results/`
- `playwright-report/`
- `.DS_Store`

## Notes

The app has no required `.env` file and no API keys.
