# Poolballz Requirements

## Runtime Requirements

- Node.js `>=20.19`
- npm
- Chromium-compatible browser for development testing

## Install Requirements

```bash
npm install
npx playwright install chromium
```

The Playwright install command is only needed if browser binaries are missing.

## Functional Requirements

- Users can search/filter the local directory.
- Users can search OpenStreetMap by venue name.
- Users can manually place a map pin.
- Users can add a pool hall or pool bar.
- Users can provide table count, vibe, table cost, drink cost, crowd level, and busy times.
- Users can update local intel for an existing venue.
- Users can vote up or down on venues, field-level facts, crowd timing, reports, and photos.
- The app requires device location inside the mapped venue address bounds before edits or votes.
- The app persists browser cache data in localStorage.
- The deployed app persists shared community data through Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured.
- The app works without Google Maps or API keys.

## Non-Functional Requirements

- No hardcoded local machine paths.
- No required secrets for local development.
- Map lookup must remain user-triggered.
- Pool-specific facts must be user-entered or explicitly marked as demo/seed data.
- Server-side writes must not retain raw device latitude/longitude in location proofs.
- Existing venue edits must validate against stored address bounds, not client-submitted replacement bounds.
- UI must be usable on desktop and phone-sized screens.

## Verification Requirements

```bash
npm test
npm run test:e2e
npm run build
```

All should pass before sharing a release or branch.
