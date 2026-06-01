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

  it('does not poison the Nominatim query with boolean operators or category suffixes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await searchVenueByName({ name: 'Stork Club', city: 'Oakland', state: 'CA' });

    const query = new URL(fetchMock.mock.calls[0][0]).searchParams.get('q');
    expect(query).not.toContain(' OR ');
    expect(query).not.toContain('billiards OR pool hall');
    expect(query).not.toContain('pool hall');
    expect(query.toLowerCase()).not.toContain('billiards');
  });

  it('sends exactly the clean name/city/state string with nothing appended', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await searchVenueByName({ name: 'Stork Club', city: 'Oakland', state: 'CA' });

    const query = new URL(fetchMock.mock.calls[0][0]).searchParams.get('q');
    expect(query).toBe('Stork Club Oakland CA');
  });

  it('builds the query from only the name when city/state are absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await searchVenueByName({ name: 'Stork Club' });

    const query = new URL(fetchMock.mock.calls[0][0]).searchParams.get('q');
    expect(query).toBe('Stork Club');
    expect(query).not.toContain(' OR ');
  });

  it('returns [] and never calls fetch for an empty or whitespace-only name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchVenueByName({ name: '', city: 'Oakland', state: 'CA' })).resolves.toEqual([]);
    await expect(
      searchVenueByName({ name: '   ', city: 'Oakland', state: 'CA' }),
    ).resolves.toEqual([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes every raw Nominatim result when multiple are returned', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          osm_type: 'node',
          osm_id: 11,
          name: 'Stork Club',
          lat: '37.81',
          lon: '-122.27',
          display_name: 'Stork Club, 2330 Telegraph Ave, Oakland, California',
          address: { city: 'Oakland', state: 'California', postcode: '94612' },
        },
        {
          osm_type: 'way',
          osm_id: 22,
          name: 'Stork Club Annex',
          lat: '37.82',
          lon: '-122.28',
          display_name: 'Stork Club Annex, Oakland, California',
          address: { town: 'Oakland', state: 'California' },
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchVenueByName({
      name: 'Stork Club',
      city: 'Oakland',
      state: 'CA',
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'node-11',
      name: 'Stork Club',
      city: 'Oakland',
      state: 'CA',
      zip: '94612',
      lat: 37.81,
      lng: -122.27,
    });
    expect(results[1]).toMatchObject({
      id: 'way-22',
      name: 'Stork Club Annex',
      city: 'Oakland',
      state: 'CA',
      lat: 37.82,
      lng: -122.28,
    });
  });
});
