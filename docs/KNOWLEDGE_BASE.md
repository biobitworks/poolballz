# Poolballz Knowledge Base

## Product Principle

OpenStreetMap provides location scaffolding. Users provide the pool-specific truth.

Poolballz should not invent:

- table counts
- table rates
- drink prices
- crowd levels
- busy windows
- vibe labels

Those fields should be seeded only by users or clearly marked seed/demo data.

## Architecture

- React renders the single-page app.
- Vite handles local development and production builds.
- Leaflet renders the OpenStreetMap tile layer.
- Nominatim search populates venue location fields.
- localStorage persists MVP venue data.
- Vitest covers helpers and component workflows.
- Playwright covers browser-level desktop/mobile flows.

## Important Files

- `src/App.jsx`: app shell, directory, map, add form, detail panel, report form.
- `src/venueLookup.js`: OpenStreetMap/Nominatim search and result normalization.
- `src/venues.js`: seed venues, ID helpers, OpenStreetMap URL generation, report merging.
- `src/storage.js`: localStorage load/save/reset.
- `src/styles.css`: responsive UI styling.
- `e2e/`: browser tests.

## OpenStreetMap And Nominatim

The app uses OpenStreetMap tiles through Leaflet and Nominatim for explicit search. It does not use Google Maps.

Nominatim should not be treated as heavy autocomplete. Keep lookup user-triggered and avoid firing a request for every keystroke.

If the app needs production-scale search, use a dedicated geocoder or hosted plan instead of the public Nominatim endpoint.

## Data Freshness

Map data can lag behind real-world venue changes. For MVP purposes:

- location fields are useful but editable
- users can manually pin venues not found in search
- pool-specific fields are community reports

## Persistence Model

Current storage key:

```text
poolballz.venues.v2
```

Bump the version or write a migration when the venue shape changes incompatibly.

## Testing Strategy

Run all three before publishing:

```bash
npm test
npm run test:e2e
npm run build
```

Vitest mocks Leaflet for fast component tests. Playwright intercepts Nominatim in e2e tests so browser tests stay deterministic.
