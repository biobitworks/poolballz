import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeLookupResult, searchVenueByName } from './venueLookup.js';

describe('venue lookup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes OpenStreetMap results into editable venue fields', () => {
    expect(
      normalizeLookupResult({
        osm_type: 'node',
        osm_id: 123,
        name: 'Cue Club',
        lat: '45.5231',
        lon: '-122.6765',
        display_name: 'Cue Club, 10 Rack St, Portland, Oregon, 97205, United States',
        address: {
          house_number: '10',
          road: 'Rack St',
          city: 'Portland',
          state: 'Oregon',
          postcode: '97205',
        },
        extratags: {
          website: 'https://cueclub.example',
          phone: '(503) 555-0101',
        },
      }),
    ).toMatchObject({
      id: 'node-123',
      name: 'Cue Club',
      address: '10 Rack St',
      city: 'Portland',
      state: 'OR',
      zip: '97205',
      lat: 45.5231,
      lng: -122.6765,
      website: 'https://cueclub.example',
      phone: '(503) 555-0101',
      source: 'OpenStreetMap',
    });
  });

  it('searches Nominatim only when a venue name is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 1,
          display_name: 'Breaktime Billiards, Austin, Texas',
          lat: '30.26',
          lon: '-97.74',
          address: { city: 'Austin', state: 'Texas' },
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchVenueByName({ name: '', city: 'Austin', state: 'TX' })).resolves.toEqual([]);
    const results = await searchVenueByName({
      name: 'Breaktime Billiards',
      city: 'Austin',
      state: 'TX',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain('nominatim.openstreetmap.org/search');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('q')).toContain(
      'Breaktime Billiards Austin TX',
    );
    expect(results[0]).toMatchObject({
      name: 'Breaktime Billiards',
      city: 'Austin',
      lat: 30.26,
      lng: -97.74,
    });
  });
});
