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

1. Use map search or click the map to place the pin.
2. Fill in venue name, type, city, and coordinates.
3. Add user-known pool details:
   - tables
   - vibe
   - table cost
   - drink cost
   - crowd level
   - crowded when
4. Click `Add Venue`.

The MVP saves data in browser localStorage.

## Update Local Intel

1. Select a venue.
2. Use `Update Local Intel`.
3. Save a new report.

The newest report updates the displayed venue summary and is kept in the venue report history.

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

- Add a backend database for shared community data.
- Add duplicate detection for imported/manual venues.
- Add moderation and report freshness.
- Add confidence indicators for crowd and cost reports.
- Add HTTPS/tunnel instructions for reliable mobile geolocation testing.
