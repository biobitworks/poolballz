import { expect, test } from '@playwright/test';

// Map search by name: type a venue name, query OpenStreetMap, pick a result, and
// have the map drop a pin there while seeding the Add-Venue form. The Nominatim
// request is intercepted so the test is deterministic and network-independent.
test('searches the map by name, drops a pin, and seeds the add form', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.route('**/nominatim.openstreetmap.org/search**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          osm_type: 'way',
          osm_id: 36979364,
          name: 'Thee Stork Club',
          lat: '37.8131364',
          lon: '-122.2683848',
          display_name:
            'Thee Stork Club, 2330, Telegraph Avenue, Oakland, Alameda County, California, 94612, United States',
          address: {
            house_number: '2330',
            road: 'Telegraph Avenue',
            city: 'Oakland',
            state: 'California',
            postcode: '94612',
          },
          extratags: { website: 'https://theestorkclub.com/' },
        },
      ]),
    }),
  );

  await page.goto('/');
  const mapPanel = page.locator('#map');
  await expect(mapPanel.locator('.leaflet-container')).toBeVisible();

  // Pin starts at the Austin default.
  await expect(page.getByText(/New pin: 30\.2672, -97\.7431/)).toBeVisible();

  await mapPanel.getByPlaceholder(/search the map by name/i).fill('Stork Club');
  await mapPanel.getByRole('button', { name: /search map/i }).click();

  // Result appears, then pick it.
  const result = mapPanel.getByRole('button', { name: /Thee Stork Club/i });
  await expect(result).toBeVisible();
  await result.click();

  // Map pin moved to the searched venue's coordinates.
  await expect(page.getByText(/New pin: 37\.8131, -122\.2684/)).toBeVisible();

  // Add-Venue form was seeded from the map search result.
  const add = page.locator('#add');
  await expect(add.getByLabel('Venue Name')).toHaveValue('Thee Stork Club');
  await expect(add.getByLabel('City')).toHaveValue('Oakland');
  await expect(add.getByLabel('State')).toHaveValue('CA');
  await expect(add.getByLabel('Latitude')).toHaveValue('37.8131364');

  expect(consoleErrors).toEqual([]);
});
