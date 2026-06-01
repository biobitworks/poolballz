import { expect, test } from '@playwright/test';

test('adds a pinned venue and updates community intel', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Open Map Pins' })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();

  const add = page.locator('#add');
  await add.getByLabel('Venue Name').fill('Nine Ball Social');
  await add.getByLabel('Venue Type').selectOption('Pool Bar');
  await add.getByLabel('Address').fill('');
  await add.getByLabel('City').fill('Portland');
  await add.getByLabel('State').fill('OR');
  await add.getByLabel('ZIP').fill('97205');
  await add.getByLabel('Latitude').fill('45.5231');
  await add.getByLabel('Longitude').fill('-122.6765');
  await add.getByLabel('Tables').fill('11');
  await add.getByLabel('Vibe').selectOption('Lively');
  await add.getByLabel('Table Cost').fill('$14/hr');
  await add.getByLabel('Drinks').fill('$7 draft');
  await add.getByLabel('Crowd Level').selectOption('Busy');
  await add.getByLabel('Crowded When').fill('Thursday leagues and Saturday after 9 PM');
  await add.getByRole('button', { name: /add venue/i }).click();

  await expect(page.getByRole('heading', { name: 'Nine Ball Social' })).toBeVisible();
  await expect(page.getByText('$14/hr').first()).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('poolballz.venues.v2'))[0]);
  expect(saved).toMatchObject({
    name: 'Nine Ball Social',
    address: 'Dropped pin',
    tableCount: 11,
    tableRate: '$14/hr',
    drinkCost: '$7 draft',
    crowdLevel: 'Busy',
    busyTimes: 'Thursday leagues and Saturday after 9 PM',
  });
  expect(saved.mapsUrl).toContain('openstreetmap.org');

  const detail = page.locator('#details');
  await detail.getByLabel('Tables').fill('12');
  await detail.getByLabel('Table Cost').fill('$16/hr weekends');
  await detail.getByLabel('Drinks').fill('$5 wells');
  await detail.getByLabel('Crowd Level').selectOption('Packed');
  await detail.getByLabel('Crowded When').fill('Friday midnight');
  await detail.getByRole('button', { name: /save report/i }).click();

  await expect(page.getByText('$16/hr weekends').first()).toBeVisible();
  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem('poolballz.venues.v2'))[0]);
  expect(updated.tableRate).toBe('$16/hr weekends');
  expect(updated.reports.length).toBeGreaterThanOrEqual(2);
  expect(consoleErrors).toEqual([]);
});
