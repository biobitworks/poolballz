import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadVenues, resetVenues, saveVenues } from './storage.js';
import { seedVenues } from './venues.js';

describe('venue localStorage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads seed venues when no community data has been saved', () => {
    expect(loadVenues()).toBe(seedVenues);
  });

  it('saves and loads community-entered venue intelligence fields', () => {
    const communityVenues = [
      {
        id: 'corner-pocket',
        name: 'Corner Pocket',
        tableCount: 9,
        vibe: 'Divey',
        tableRate: '$1/game',
        drinkCost: '$4 draft',
        crowdLevel: 'Busy',
        busyTimes: 'Friday 9 PM to close',
        reports: [
          {
            id: 'report-corner-pocket',
            tableCount: 9,
            tableRate: '$1/game',
            drinkCost: '$4 draft',
            crowdLevel: 'Busy',
            busyTimes: 'Friday 9 PM to close',
          },
        ],
      },
    ];

    saveVenues(communityVenues);

    expect(loadVenues()).toEqual([
      {
        ...communityVenues[0],
        address: 'Dropped pin',
        mapsUrl: undefined,
      },
    ]);
  });

  it('falls back to seed venues for corrupted or empty stored data', () => {
    window.localStorage.setItem(STORAGE_KEY, '{bad json');
    expect(loadVenues()).toBe(seedVenues);

    saveVenues([]);
    expect(loadVenues()).toBe(seedVenues);
  });

  it('can reset saved community venues', () => {
    saveVenues([{ id: 'temporary-venue' }]);

    resetVenues();

    expect(loadVenues()).toBe(seedVenues);
  });
});
