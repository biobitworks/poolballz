import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  VOTE_RECEIPTS_KEY,
  loadVenues,
  loadVoteReceipts,
  normalizeVenues,
  resetVenues,
  saveVenues,
  saveVoteReceipts,
} from './storage.js';
import { seedVenues } from './venues.js';

describe('venue localStorage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads seed venues when no community data has been saved', () => {
    const loaded = loadVenues();
    expect(loaded).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: seedVenues[0].id,
          fieldSubmissions: expect.arrayContaining([
            expect.objectContaining({ fieldKey: 'name', value: seedVenues[0].name }),
            expect.objectContaining({ fieldKey: 'address', value: seedVenues[0].address }),
            expect.objectContaining({ fieldKey: 'website', value: seedVenues[0].website }),
          ]),
        }),
      ]),
    );
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
            votes: { up: 0, down: 0 },
          },
        ],
      },
    ];

    saveVenues(communityVenues);

    const loaded = loadVenues();
    expect(loaded[0]).toMatchObject({
      ...communityVenues[0],
      address: 'Dropped pin',
      accuracyVotes: { up: 0, down: 0 },
      mapsUrl: undefined,
      imageSubmissions: [],
    });
    expect(loaded[0].fieldSubmissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: 'tableRate',
          value: '$1/game',
          legacyReportId: 'report-corner-pocket',
          votes: { up: 0, down: 0 },
        }),
        expect.objectContaining({
          fieldKey: 'busyTimes',
          value: 'Friday 9 PM to close',
          legacyReportId: 'report-corner-pocket',
        }),
      ]),
    );
  });

  it('normalizes missing or malformed accuracy votes for older saved venues', () => {
    saveVenues([
      {
        id: 'old-venue',
        name: 'Old Venue',
        accuracyVotes: { up: '2', down: -1, userVote: 'down' },
        reports: [{ id: 'report-old', votes: { up: '3', down: '1', userVote: 'up' } }],
      },
      { id: 'legacy-venue', name: 'Legacy Venue' },
    ]);

    const loaded = loadVenues();
    expect(loaded.map((venue) => venue.accuracyVotes)).toEqual([
      { up: 2, down: 0 },
      { up: 0, down: 0 },
    ]);
    expect(loaded[0].reports[0].votes).toEqual({ up: 3, down: 1 });
  });

  it('keeps anonymous vote receipts in a separate local-only store', () => {
    saveVoteReceipts({
      'venue:breaktime-billiards': 'down',
      'field:breaktime-billiards:report-1:phone': 'up',
      bad: 'maybe',
    });

    expect(loadVoteReceipts()).toEqual({
      'venue:breaktime-billiards': 'down',
      'field:breaktime-billiards:report-1:phone': 'up',
    });
    expect(window.localStorage.getItem(VOTE_RECEIPTS_KEY)).toContain('venue:breaktime-billiards');
  });

  it('normalizes venue defaults before generating stable field submissions', () => {
    const [loaded] = normalizeVenues([
      {
        id: 'stable-hall',
        name: 'Stable Hall',
        address: '1 Rack Rd',
        city: 'Austin',
        state: 'TX',
        lat: 30.2672,
        lng: -97.7431,
        reports: [],
      },
    ]);

    const [renormalized] = normalizeVenues([loaded]);

    expect(loaded.fieldSubmissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'field-stable-hall-base-phoneType',
          fieldKey: 'phoneType',
          value: 'Main',
        }),
      ]),
    );
    expect(renormalized).toEqual(loaded);
  });

  it('falls back to seed venues for corrupted or empty stored data', () => {
    window.localStorage.setItem(STORAGE_KEY, '{bad json');
    expect(loadVenues()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: seedVenues[0].id })]),
    );

    saveVenues([]);
    expect(loadVenues()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: seedVenues[0].id })]),
    );
  });

  it('can reset saved community venues', () => {
    saveVenues([{ id: 'temporary-venue' }]);

    resetVenues();

    expect(loadVenues()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: seedVenues[0].id })]),
    );
  });
});
