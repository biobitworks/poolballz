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

Short community facts use SMS-length entries. Hours, amenities, descriptions, tips, costs, drinks, crowd notes, and best-time notes should be stored as one-line strings capped at 160 characters so each item remains easy to vote on.

## Architecture

- React renders the single-page app.
- Vite handles local development and production builds.
- Leaflet renders the OpenStreetMap tile layer.
- Nominatim search populates venue location fields.
- localStorage persists a browser cache.
- `/api/venues` persists shared deployed data.
- Vercel Blob stores the shared venue snapshot and append-only vote events when `BLOB_READ_WRITE_TOKEN` is configured.
- Vitest covers helpers and component workflows.
- Playwright covers browser-level desktop/mobile flows.

## Important Files

- `src/App.jsx`: app shell, directory, map, add form, detail panel, report form.
- `src/venueLookup.js`: OpenStreetMap/Nominatim search and result normalization.
- `src/venues.js`: seed venues, ID helpers, OpenStreetMap URL generation, report merging.
- `src/storage.js`: localStorage cache plus remote API load/save helpers.
- `api/venues.js`: server-side venue snapshot read/write and address-bound proof enforcement.
- `api/venueStore.js`: Vercel Blob adapter with temporary file fallback.
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

The browser keeps localStorage as a fast cache. The deployed shared source of truth is `/api/venues`. That endpoint chooses storage at runtime:

- `vercel-blob`: durable shared storage through Vercel Blob.
- `file-fallback`: temporary serverless file storage used only when Blob env vars are missing.

The API rejects changed venue snapshots unless the submitted device location is inside the trusted venue address bounds. For existing venues, the server uses the stored bounds instead of trusting newly submitted bounds.

Shared vote records expose aggregate `up`/`down` counts and location proof only. The current browser's pressed vote state is stored separately in localStorage under `poolballz.voteReceipts.v1`, so one anonymous user's button state is not written into shared community data.

Vote actions use a per-action API path instead of posting a client-modified full venue snapshot. The server reads the latest stored venue data, verifies the device is inside the venue address bounds, creates the location proof, and appends an anonymous vote event under `poolballz/vote-events/`. API reads rebuild aggregate vote totals from those events after zeroing any stale counts in the venue snapshot. This avoids stale browser snapshots becoming the source of truth for confidence totals.

## Testing Strategy

Run all three before publishing:

```bash
npm test
npm run test:e2e
npm run build
```

Vitest mocks Leaflet for fast component tests. Playwright intercepts Nominatim in e2e tests so browser tests stay deterministic.
