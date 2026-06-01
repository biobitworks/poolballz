import { describe, expect, it } from 'vitest';
import {
  getVenueStore,
  hasBlobConfig,
  readBlobVenues,
  readBlobVoteEvents,
  writeBlobVenues,
  writeBlobVoteEvent,
} from './venueStore.js';

describe('venue durable store adapter', () => {
  it('uses Vercel Blob only when the blob token is configured', async () => {
    expect(hasBlobConfig({})).toBe(false);
    expect(hasBlobConfig({ BLOB_READ_WRITE_TOKEN: 'token' })).toBe(true);

    const fallback = await getVenueStore({});
    expect(fallback.name).toBe('file-fallback');
  });

  it('reads and writes normalized venues through the blob client contract', async () => {
    const stored = {
      id: 'blob-hall',
      name: 'Blob Hall',
      type: 'Pool Hall',
      address: '1 Durable Way',
      city: 'Austin',
      state: 'TX',
      countryCode: 'US',
      lat: 30,
      lng: -97,
      reports: [],
    };
    let body = JSON.stringify([stored]);
    const client = {
      get: async () => ({ stream: new Response(body).body }),
      put: async (_path, nextBody) => {
        body = nextBody;
        return {};
      },
    };

    const read = await readBlobVenues(client);
    expect(read[0]).toMatchObject({ id: 'blob-hall', name: 'Blob Hall' });

    const written = await writeBlobVenues(client, [
      {
        ...stored,
        phone: '(512) 555-9999',
        accuracyVotes: { up: 1, down: 0, userVote: 'up' },
        reports: [{ id: 'report-blob', votes: { up: 0, down: 1, userVote: 'down' } }],
      },
    ]);
    expect(written[0].fieldSubmissions).toEqual(
      expect.arrayContaining([expect.objectContaining({ fieldKey: 'phone', value: '(512) 555-9999' })]),
    );
    expect(JSON.parse(body)[0].phone).toBe('(512) 555-9999');
    expect(JSON.parse(body)[0].accuracyVotes).toEqual({ up: 1, down: 0 });
    expect(body).not.toContain('userVote');
  });

  it('reads and writes anonymous vote events through unique blob objects', async () => {
    const writes = [];
    const eventBodies = new Map([
      [
        'poolballz/vote-events/event-b.json',
        JSON.stringify({
          id: 'event-b',
          target: { type: 'venue', venueId: 'blob-hall' },
          vote: 'down',
          createdAt: '2026-06-01T12:01:00.000Z',
        }),
      ],
      [
        'poolballz/vote-events/event-a.json',
        JSON.stringify({
          id: 'event-a',
          target: { type: 'venue', venueId: 'blob-hall' },
          vote: 'up',
          createdAt: '2026-06-01T12:00:00.000Z',
        }),
      ],
    ]);
    const client = {
      list: async ({ prefix, cursor, limit }) => {
        expect(prefix).toBe('poolballz/vote-events/');
        expect(limit).toBe(1000);
        expect(cursor).toBeUndefined();
        return {
          blobs: [...eventBodies.keys()].map((pathname) => ({ pathname })),
          hasMore: false,
        };
      },
      get: async (pathname, options) => {
        expect(options).toMatchObject({ access: 'private', useCache: false });
        return { stream: new Response(eventBodies.get(pathname)).body };
      },
      put: async (pathname, body, options) => {
        writes.push({ pathname, body, options });
        return {};
      },
    };

    const events = await readBlobVoteEvents(client);
    expect(events.map((event) => event.id)).toEqual(['event-a', 'event-b']);

    await writeBlobVoteEvent(client, {
      id: 'event/new vote',
      target: { type: 'venue', venueId: 'blob-hall' },
      vote: 'down',
      createdAt: '2026-06-01T12:02:00.000Z',
    });
    expect(writes[0].pathname).toBe('poolballz/vote-events/event-new-vote.json');
    expect(writes[0].options).toMatchObject({
      access: 'private',
      allowOverwrite: false,
      cacheControlMaxAge: 0,
      contentType: 'application/json',
    });
  });
});
