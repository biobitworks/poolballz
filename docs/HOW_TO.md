# Poolballz How-To Guide

## Run The App Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Share On A Local Network

Run:

```bash
npm run dev
```

Vite prints one or more `Network:` URLs. Use the URL that matches your local network, for example `http://<your-lan-ip>:5173/`.

Manual map pinning works over local HTTP. Browser geolocation can require HTTPS on mobile browsers, so if location permission fails, search the map by name or click the map to place a pin.

## Search For A Venue

1. Go to the map panel.
2. Search a venue name.
3. Choose a result.
4. The map pin and Add Venue form are seeded from OpenStreetMap.
5. Review and edit the address, city, state, ZIP, and coordinates.

If the result is missing, add the venue manually by placing the pin and filling the form.

## Add A Venue

1. Use map search to select a mapped address result.
2. Use `Use My Location` while physically inside that venue address boundary.
3. Fill in venue name and address. Other details are optional.
4. Add user-known pool details:
   - tables
   - vibe
   - table cost
   - drink cost
   - crowd level
   - crowded when
   - best times
   - accessibility
   - entry policy
   - tips
5. Click `Add Venue`.

The app saves local cache data in browser localStorage and syncs shared deployed data through the `/api/venues` endpoint. Production uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured; otherwise the API falls back to temporary file storage.

## Update Local Intel

1. Select a venue.
2. Use `Use My Location` while inside the venue address boundary.
3. Use `Update Local Intel`.
4. Save a new anonymous report.

Every submitted fact is kept as a discrete community submission. Votes recalculate the consensus shown in the venue summary and confidence panels.

Short text facts such as hours, amenities, descriptions, tips, costs, drinks, and busy/best times are single-line 160-character entries. Keep each submission to one concrete fact rather than a paragraph.

## Vote On Accuracy

1. Select a venue.
2. Use `Use My Location` while inside the venue address boundary.
3. Vote on the venue, field-level facts, crowd timing, reports, or photos.

Votes are anonymous in the shared app state. Shared venue data stores aggregate counts, not the current browser's `up` or `down` selection. The local browser remembers its own pressed vote buttons in localStorage only. Location proof stores only that the device was address-bound verified, the verification time, method, and rounded distance; raw latitude/longitude is not stored in the proof.

Votes sync through a server-side vote action. The browser sends the target and vote, not a modified venue snapshot. The server verifies the current device location is inside the venue address bounds, appends an anonymous vote event, and recalculates visible vote totals from the event log.

## Vercel Blob Setup

The linked Vercel project should have a private Blob store connected to production, preview, and development. To inspect or recreate it:

```bash
npx vercel blob list-stores
npx vercel blob create-store poolballz-venues --access private --yes --environment production --environment preview --environment development
npx vercel env ls
```

After creating or linking a store, redeploy:

```bash
npx vercel --prod --yes
```

The live API should then report:

```json
{ "storage": "vercel-blob" }
```

## Run Checks

```bash
npm test
npm run test:e2e
npm run build
```

If Playwright browsers are missing:

```bash
npx playwright install chromium
```

## Continue Development

Suggested next steps:

- Add duplicate detection for imported/manual venues.
- Add moderation and report freshness.
- Add HTTPS/tunnel instructions for reliable mobile geolocation testing.
