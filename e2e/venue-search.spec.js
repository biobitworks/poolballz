import { expect, test } from '@playwright/test';

// Regression coverage for the "Find Venue" bug where the Nominatim query
// appended the literal "billiards OR pool hall" suffix, causing real venues
// (e.g. the Stork Club) to return zero results. The fix removed that suffix
// and a new seed venue "Thee Stork Club" (Oakland, CA) was added.
//
// This spec deliberately avoids hitting the live Nominatim network (flaky in
// CI). It exercises the seed-venue directory + search + map selection flow.
test('seed venue Thee Stork Club renders, filters, and selects with a map', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('.leaflet-container')).toBeVisible();

  // The directory defaults to a city filter of "Austin", which scopes the list
  // to Austin venues. Clear it so the full seed list (incl. the Oakland venue)
  // is shown on the directory.
  const directory = page.getByRole('region', { name: /venues found/i });
  await directory.getByPlaceholder('Austin').fill('');

  // 1. Seed venue renders in the directory list.
  const storkRow = page.locator('.venue-row', { hasText: 'Thee Stork Club' });
  await expect(storkRow).toBeVisible();

  // 2. Typing "Stork" into the directory search box filters the list down to
  //    Thee Stork Club.
  const search = page.getByPlaceholder('Search by name, city, or keyword');
  await search.fill('Stork');

  await expect(page.locator('.venue-row')).toHaveCount(1);
  await expect(page.locator('.venue-row', { hasText: 'Thee Stork Club' })).toBeVisible();

  // 3. Selecting the venue keeps it visible and a Leaflet map is present.
  await page.locator('.venue-row', { hasText: 'Thee Stork Club' }).click();
  await expect(page.locator('.venue-row.selected', { hasText: 'Thee Stork Club' })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();

  // 4. No console errors during the flow.
  expect(consoleErrors).toEqual([]);
});
