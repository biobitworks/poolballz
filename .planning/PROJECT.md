# Poolballz

## What This Is

Poolballz is a mobile-friendly web app for finding pool halls and pool bars in a city, then improving the listing with local player reports. It is intentionally user-centric: users add or pin venues and report practical details that generic maps usually miss, including table count, table cost, drink cost, vibe, crowd level, and when a place gets busy.

## Core Value

Help a pool player land in a city and quickly find a real place to play with trustworthy community-entered details.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Show a directory of pool halls and pool bars that can be searched and filtered.
- [ ] Let users add a new pool hall or pool bar without requiring AI-generated venue facts.
- [ ] Let users pin a venue on an open-source map and use browser location when available.
- [ ] Capture user-entered table count, vibe, table cost, drink cost, crowd level, and busy times.
- [ ] Persist added venues and reports locally for the MVP.
- [ ] Run as a web app with a local URL/IP for testing on desktop or phone.

### Out of Scope

- Google Maps integration - explicitly not needed for the MVP; use OpenStreetMap/Leaflet instead.
- AI-generated venue intelligence - venue quality data should come from users.
- Accounts, moderation, and backend database - defer until the local MVP workflow is validated.

## Context

The current MVP is being built greenfield in `/Users/byron/projects/active/poolballz` as a React + Vite app. The app should prioritize the actual usable experience over a landing page. A generated visual concept exists at `assets/concept-poolballz.png`, and the implementation uses `assets/poolhall-detail.png` as a venue detail image.

## Constraints

- **Map provider**: Use an open-source map path with OpenStreetMap/Leaflet - avoids Google Maps dependency and API keys.
- **Data source**: Community-entered details are authoritative for pool-specific fields - prevents AI or generic map data from inventing facts.
- **MVP storage**: Use localStorage - fast to ship and enough to test the interaction model.
- **Frontend**: React + Vite - standard lightweight stack for a single-page app.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Public add/report workflow | The user wants user-centric contribution, not gated AI-generated data | - Pending |
| OpenStreetMap/Leaflet instead of Google Maps | User clarified Google Maps access is not needed | - Pending |
| LocalStorage for MVP | Enough to validate adding venues, pins, and reports before a backend | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-31 after initialization*
