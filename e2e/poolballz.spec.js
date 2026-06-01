import { expect, test } from '@playwright/test';

test('adds a pinned venue and updates community intel', async ({ page, context }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 45.5231, longitude: -122.6765 });
  await page.route('https://nominatim.openstreetmap.org/search**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          osm_type: 'node',
          osm_id: 900,
          name: 'Nine Ball Social',
          display_name: 'Nine Ball Social, 700 Rack Ave, Portland, Oregon, 97205, United States',
          lat: '45.5231',
          lon: '-122.6765',
          boundingbox: ['45.5229', '45.5233', '-122.6767', '-122.6763'],
          address: {
            house_number: '700',
            road: 'Rack Ave',
            city: 'Portland',
            state: 'Oregon',
            postcode: '97205',
          },
        },
      ]),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /use my location/i }).click();
  await expect(page.getByRole('heading', { name: 'Open Map Pins' })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();

  const add = page.locator('#add');
  await add.getByLabel('Venue Name').fill('Nine Ball Social');
  await add.getByRole('button', { name: /find venue/i }).click();
  await add.getByRole('button', { name: /Nine Ball Social/i }).click();
  await add.getByLabel('Venue Type').selectOption('Pool Bar');
  await add.getByLabel('Tables').fill('11');
  await add.getByLabel('Vibe').selectOption('Lively');
  await add.getByLabel('Table Cost').fill('$14/hr');
  await add.getByLabel('Drinks').fill('$7 draft');
  await add.getByLabel('Crowd Level').selectOption('Busy');
  await add.getByLabel('Crowd Day').selectOption('Thursday');
  await add.getByLabel('Crowd Time').selectOption('8-11');
  await add.getByLabel('Crowded When').fill('Thursday leagues and Saturday after 9 PM');
  await add.getByRole('button', { name: /add venue/i }).click();

  await expect(page.getByRole('heading', { name: 'Nine Ball Social' })).toBeVisible();
  await expect(page.getByText('$14/hr').first()).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('poolballz.venues.v2'))[0]);
  expect(saved).toMatchObject({
    name: 'Nine Ball Social',
    address: '700 Rack Ave',
    tableCount: 11,
    tableRate: '$14/hr',
    drinkCost: '$7 draft',
    crowdLevel: 'Busy',
    busyTimes: 'Thursday leagues and Saturday after 9 PM',
    locationProof: { addressVerified: true, method: 'address-bounds', distanceMeters: 0 },
  });
  expect(saved.mapsUrl).toContain('openstreetmap.org');

  const detail = page.locator('#details');
  const reportForm = detail.getByRole('form', { name: /update venue report/i });
  await reportForm.getByLabel('Tables').fill('12');
  await reportForm.getByLabel('Table Cost').fill('$16/hr weekends');
  await reportForm.getByLabel('Drinks').fill('$5 wells');
  await reportForm.getByLabel('Crowd Level').selectOption('Packed');
  await reportForm.getByLabel('Crowd Day').selectOption('Friday');
  await reportForm.getByLabel('Crowd Time').selectOption('11-close');
  await reportForm.getByLabel('Crowded When').fill('Friday midnight');
  await reportForm.getByRole('button', { name: /save report/i }).click();

  await expect(page.getByText('$16/hr weekends').first()).toBeVisible();
  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem('poolballz.venues.v2'))[0]);
  expect(updated.tableRate).toBe('$16/hr weekends');
  expect(updated.reports.length).toBeGreaterThanOrEqual(2);
  expect(consoleErrors).toEqual([]);
});
