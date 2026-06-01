# Poolballz

```text
        _______________________________
       /                               \
      /   o(8)=======================>  \
     /___________________________________\

      POOLBALLZ
      community pool hall intel
```

Poolballz is a community-powered web app for finding pool halls and pool bars. It uses OpenStreetMap for venue search and pins, then keeps the pool-specific details user-entered: table count, vibe, table cost, drink prices, crowd level, and when the room gets busy.

## Why This Exists

Generic maps can tell you where a bar is. Poolballz is for the facts pool players actually care about when they land in a city:

- How many tables are there?
- Is it a serious room, a dive bar, or a chill spot?
- What does a table cost?
- What do drinks cost?
- When does it get crowded?
- Can another player add or correct the local intel?

## Features

- OpenStreetMap/Leaflet map pins, no Google Maps dependency.
- Search the map by venue name and populate address/coordinates from OpenStreetMap.
- Add pool halls or pool bars manually.
- Save community reports for tables, vibe, costs, crowd level, and busy windows.
- LocalStorage persistence for the MVP.
- Desktop and mobile responsive UI.
- Unit and Playwright e2e coverage.

## Requirements

- Node.js `>=20.19`
- npm
- A modern browser

No API keys are required.

## Quick Start

```bash
git clone https://github.com/biobitworks/poolballz.git
cd poolballz
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

To test from a phone on the same network, use the `Network:` URL printed by Vite. Manual map pinning works over HTTP. Browser geolocation may require HTTPS depending on the phone/browser.

## Scripts

```bash
npm run dev       # start local development server
npm test          # run Vitest unit/component tests
npm run test:e2e  # run Playwright desktop/mobile e2e tests
npm run build     # create production build in dist/
npm run preview   # preview the production build
```

## Project Structure

```text
src/
  App.jsx              main app UI and workflows
  styles.css           responsive app styling
  venues.js            seed venue data and report helpers
  storage.js           localStorage persistence
  venueLookup.js       OpenStreetMap/Nominatim lookup helper
e2e/
  *.spec.js            Playwright browser tests
docs/
  HOW_TO.md            user and developer workflows
  KNOWLEDGE_BASE.md    architecture notes and data policy
  REQUIREMENTS.md      product and technical requirements
  HARDCODED_PATH_AUDIT.md
assets/
  concept-poolballz.png
  poolhall-detail.png
```

## Data Policy

OpenStreetMap lookup is used only to populate location fields. Pool-specific intel should come from users, not AI or assumptions.

## Notes For Contributors

See [docs/HOW_TO.md](docs/HOW_TO.md) and [docs/KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md).
