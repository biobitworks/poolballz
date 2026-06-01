import { describe, expect, it } from 'vitest';
import { normalizeVenues } from '../src/storage.js';
import {
  applyVoteEvents,
  prepareVenueSnapshot,
  prepareVoteMutation,
  readVenues,
  writeVenues,
  writeVote,
} from './venues.js';

describe('venue API proof enforcement', () => {
  const previous = normalizeVenues([
    {
      id: 'proof-hall',
      name: 'Proof Hall',
      type: 'Pool Hall',
      address: '10 Rack St',
      city: 'Austin',
      state: 'TX',
      countryCode: 'US',
      lat: 30.2672,
      lng: -97.7431,
      boundingBox: { south: 30.2668, north: 30.2676, west: -97.7435, east: -97.7427 },
      reports: [],
    },
  ]);
  const voteFixture = normalizeVenues([
    {
      ...previous[0],
      accuracyVotes: { up: 0, down: 0 },
      reports: [
        {
          id: 'report-proof',
          tableRate: '$12/hr',
          votes: { up: 0, down: 0 },
          fieldVotes: { tableRate: { up: 0, down: 0 } },
          crowdSlots: [
            {
              id: 'slot-proof',
              day: 'Friday',
              timeBucket: '8-11',
              crowdLevel: 'Busy',
              votes: { up: 0, down: 0 },
            },
          ],
        },
      ],
      fieldSubmissions: [
        {
          id: 'field-proof',
          fieldKey: 'phone',
          value: '(512) 555-1212',
          votes: { up: 0, down: 0 },
        },
      ],
      imageSubmissions: [
        {
          id: 'image-proof',
          dataUrl: 'data:image/png;base64,abc',
          votes: { up: 0, down: 0 },
        },
      ],
    },
  ]);

  it('rejects changed venues when the supplied location is outside address bounds', () => {
    const next = [{ ...previous[0], phone: '(512) 555-1212' }];

    expect(() => prepareVenueSnapshot(previous, next, { lat: 30.268, lng: -97.7431 })).toThrow(
      /inside the changed venue address bounds/i,
    );
  });

  it('uses stored address bounds for existing venues instead of trusting submitted bounds', () => {
    const next = [
      {
        ...previous[0],
        phone: '(512) 555-1212',
        boundingBox: { south: 45.5229, north: 45.5233, west: -122.6767, east: -122.6763 },
      },
    ];

    expect(() => prepareVenueSnapshot(previous, next, { lat: 45.5231, lng: -122.6765 })).toThrow(
      /inside the changed venue address bounds/i,
    );
  });

  it('rejects snapshot removals so inaccurate venues are handled by votes', () => {
    expect(() => prepareVenueSnapshot(previous, [], { lat: 30.2672, lng: -97.7431 })).toThrow(
      /removal is disabled/i,
    );
  });

  it('stamps changed venues with server-created proof and does not retain raw coordinates', () => {
    const next = [{ ...previous[0], phone: '(512) 555-1212' }];
    const checked = prepareVenueSnapshot(previous, next, { lat: 30.2672, lng: -97.7431 });

    expect(checked[0].locationProof).toMatchObject({
      addressVerified: true,
      method: 'address-bounds',
      distanceMeters: 0,
    });
    expect(checked[0].locationProof).not.toHaveProperty('lat');
    expect(checked[0].locationProof).not.toHaveProperty('lng');
  });

  it('strips client-local userVote state from all shared vote records', () => {
    const next = [
      {
        ...previous[0],
        phone: '(512) 555-1212',
        accuracyVotes: { up: 1, down: 0, userVote: 'up' },
        reports: [
          {
            id: 'report-proof',
            tableRate: '$12/hr',
            votes: { up: 0, down: 1, userVote: 'down' },
            fieldVotes: { tableRate: { up: 1, down: 0, userVote: 'up' } },
            crowdSlots: [
              {
                id: 'slot-proof',
                day: 'Friday',
                timeBucket: '8-11',
                crowdLevel: 'Busy',
                votes: { up: 0, down: 1, userVote: 'down' },
              },
            ],
          },
        ],
        fieldSubmissions: [
          {
            id: 'field-proof',
            fieldKey: 'phone',
            value: '(512) 555-1212',
            votes: { up: 1, down: 0, userVote: 'up' },
          },
        ],
        imageSubmissions: [
          {
            id: 'image-proof',
            dataUrl: 'data:image/png;base64,abc',
            votes: { up: 0, down: 1, userVote: 'down' },
          },
        ],
      },
    ];

    const checked = prepareVenueSnapshot(previous, next, { lat: 30.2672, lng: -97.7431 });

    expect(JSON.stringify(checked)).not.toContain('userVote');
    expect(checked[0].reports[0].fieldVotes.tableRate).toMatchObject({ up: 1, down: 0 });
    expect(checked[0].imageSubmissions[0].votes).toMatchObject({ up: 0, down: 1 });
  });

  it('applies vote actions against the latest stored venue state', async () => {
    let stored = voteFixture;
    const store = {
      read: async () => stored,
      write: async (venues) => {
        stored = venues;
        return venues;
      },
    };

    await writeVote(
      {
        target: { type: 'venue', venueId: 'proof-hall' },
        vote: 'down',
        location: { lat: 30.2672, lng: -97.7431 },
      },
      store,
    );
    const written = await writeVote(
      {
        target: { type: 'venue', venueId: 'proof-hall' },
        vote: 'down',
        location: { lat: 30.2672, lng: -97.7431 },
      },
      store,
    );

    expect(written[0].accuracyVotes).toMatchObject({ up: 0, down: 2 });
    expect(JSON.stringify(written)).not.toContain('userVote');
  });

  it('rebuilds vote totals from append-only events instead of trusting stale snapshots', async () => {
    const proof = {
      addressVerified: true,
      method: 'address-bounds',
      verifiedAt: '2026-06-01T12:00:00.000Z',
      distanceMeters: 0,
    };
    const venues = await readVenues({
      read: async () => [
        {
          ...voteFixture[0],
          accuracyVotes: { up: 0, down: 99, userVote: 'down' },
          reports: [{ ...voteFixture[0].reports[0], votes: { up: 40, down: 0 } }],
        },
      ],
      readVoteEvents: async () => [
        {
          id: 'event-1',
          target: { type: 'venue', venueId: 'proof-hall' },
          vote: 'down',
          locationProof: proof,
          createdAt: '2026-06-01T12:00:00.000Z',
        },
      ],
    });

    expect(venues[0].accuracyVotes).toMatchObject({ up: 0, down: 1, locationProof: proof });
    expect(venues[0].reports[0].votes).toEqual({ up: 0, down: 0 });
    expect(JSON.stringify(venues)).not.toContain('userVote');
  });

  it('applies ordered vote events including local receipt reversals', () => {
    const proof = {
      addressVerified: true,
      method: 'address-bounds',
      verifiedAt: '2026-06-01T12:00:00.000Z',
      distanceMeters: 0,
    };
    const venues = applyVoteEvents(voteFixture, [
      {
        id: 'event-2',
        target: { type: 'venue', venueId: 'proof-hall' },
        vote: 'down',
        previousVote: 'down',
        locationProof: proof,
        createdAt: '2026-06-01T12:01:00.000Z',
      },
      {
        id: 'event-1',
        target: { type: 'venue', venueId: 'proof-hall' },
        vote: 'down',
        locationProof: proof,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
    ]);

    expect(venues[0].accuracyVotes).toMatchObject({ up: 0, down: 0, locationProof: proof });
  });

  it('appends vote events without rewriting the venue snapshot', async () => {
    const events = [];
    let snapshotWriteCount = 0;
    const store = {
      read: async () => voteFixture,
      write: async () => {
        snapshotWriteCount += 1;
        return voteFixture;
      },
      readVoteEvents: async () => events,
      writeVoteEvent: async (event) => {
        events.push(event);
        return event;
      },
    };

    await writeVote(
      {
        target: { type: 'venue', venueId: 'proof-hall' },
        vote: 'down',
        location: { lat: 30.2672, lng: -97.7431 },
      },
      store,
    );
    const written = await writeVote(
      {
        target: { type: 'venue', venueId: 'proof-hall' },
        vote: 'down',
        location: { lat: 30.2672, lng: -97.7431 },
      },
      store,
    );

    expect(events).toHaveLength(2);
    expect(snapshotWriteCount).toBe(0);
    expect(written[0].accuracyVotes).toMatchObject({ up: 0, down: 2 });
    expect(events[0].locationProof).toMatchObject({ addressVerified: true, method: 'address-bounds' });
    expect(events[0].locationProof).not.toHaveProperty('lat');
    expect(events[0].locationProof).not.toHaveProperty('lng');
  });

  it('supports report, field, image, and crowd vote targets', () => {
    const reportVoted = prepareVoteMutation(voteFixture, {
      target: { type: 'report', venueId: 'proof-hall', reportId: 'report-proof' },
      vote: 'up',
      location: { lat: 30.2672, lng: -97.7431 },
    });
    const fieldVoted = prepareVoteMutation(reportVoted, {
      target: { type: 'field', venueId: 'proof-hall', reportId: 'field-proof', fieldKey: 'phone' },
      vote: 'down',
      location: { lat: 30.2672, lng: -97.7431 },
    });
    const imageVoted = prepareVoteMutation(fieldVoted, {
      target: { type: 'image', venueId: 'proof-hall', imageId: 'image-proof' },
      vote: 'up',
      location: { lat: 30.2672, lng: -97.7431 },
    });
    const crowdVoted = prepareVoteMutation(imageVoted, {
      target: { type: 'crowd', venueId: 'proof-hall', reportId: 'report-proof', slotId: 'slot-proof' },
      vote: 'down',
      location: { lat: 30.2672, lng: -97.7431 },
    });

    expect(crowdVoted[0].reports[0].votes).toMatchObject({ up: 1, down: 0 });
    expect(crowdVoted[0].fieldSubmissions[0].votes).toMatchObject({ up: 0, down: 1 });
    expect(crowdVoted[0].imageSubmissions[0].votes).toMatchObject({ up: 1, down: 0 });
    expect(crowdVoted[0].reports[0].crowdSlots[0].votes).toMatchObject({ up: 0, down: 1 });
  });

  it('rejects invalid vote targets without changing stored data', () => {
    expect(() =>
      prepareVoteMutation(voteFixture, {
        target: { type: 'field', venueId: 'proof-hall', reportId: 'field-proof', fieldKey: 'notAField' },
        vote: 'up',
        location: { lat: 30.2672, lng: -97.7431 },
      }),
    ).toThrow(/target was not found/i);
    expect(() =>
      prepareVoteMutation(voteFixture, {
        target: { type: 'venue', venueId: 'proof-hall' },
        vote: 'sideways',
        location: { lat: 30.2672, lng: -97.7431 },
      }),
    ).toThrow(/vote must be up or down/i);
  });

  it('uses the injected store for API reads and proof-gated writes', async () => {
    let stored = previous;
    const store = {
      read: async () => stored,
      write: async (venues) => {
        stored = venues;
        return venues;
      },
    };

    expect(await readVenues(store)).toBe(previous);
    const written = await writeVenues([{ ...previous[0], website: 'proof.example' }], { lat: 30.2672, lng: -97.7431 }, store);
    expect(written[0]).toMatchObject({
      website: 'proof.example',
      locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
    });
    expect(stored[0].website).toBe('proof.example');
  });
});
