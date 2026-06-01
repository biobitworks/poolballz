import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { STORAGE_KEY, VOTE_RECEIPTS_KEY } from './storage.js';

const voteTestVenues = [
  {
    id: 'breaktime-billiards',
    source: 'test fixture',
    name: 'Breaktime Billiards',
    type: 'Pool Hall',
    city: 'Austin',
    state: 'TX',
    address: '123 Cue Ln',
    zip: '78701',
    countryCode: 'US',
    currencyCode: 'USD',
    lat: 30.2672,
    lng: -97.7431,
    boundingBox: { south: 30.2668, north: 30.2676, west: -97.7435, east: -97.7427 },
    tableCount: 8,
    vibe: 'Chill',
    tableRate: '$12/hr',
    drinkCost: '$6 beer',
    crowdLevel: 'Steady',
    busyTimes: 'Friday after 9 PM',
    phone: '(512) 555-0198',
    reports: [
      {
        id: 'report-breaktime-1',
        tableRate: '$12/hr',
        crowdSlots: [
          {
            id: 'crowd-report-breaktime-1-Friday-8-11',
            day: 'Friday',
            timeBucket: '8-11',
            crowdLevel: 'Steady',
            votes: { up: 0, down: 0 },
          },
        ],
        createdAt: 'Test report',
      },
    ],
  },
];

function useVoteTestVenue() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(voteTestVenues));
}

describe('Poolballz app venue submission', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 30.2672, longitude: -97.7431 } }),
        ),
      },
    });
  });

  it('looks up a venue name and populates editable map/address fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            osm_type: 'node',
            osm_id: 100,
            name: 'Cue Club',
            display_name: 'Cue Club, 10 Rack St, Portland, Oregon, 97205, United States',
            lat: '45.5231',
            lon: '-122.6765',
            boundingbox: ['45.5229', '45.5233', '-122.6767', '-122.6763'],
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
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /use my location/i }));

    const addPanel = within(screen.getByRole('heading', { name: 'Add New Venue' }).closest('section'));
    await user.clear(addPanel.getByLabelText('Venue Name'));
    await user.type(addPanel.getByLabelText('Venue Name'), 'Cue Club');
    await user.clear(addPanel.getByLabelText('City'));
    await user.type(addPanel.getByLabelText('City'), 'Portland');
    await user.click(addPanel.getByRole('button', { name: /find venue/i }));
    await user.click(await addPanel.findByRole('button', { name: /Cue Club/i }));

    expect(addPanel.getByLabelText('Address').value).toBe('10 Rack St');
    expect(addPanel.getByLabelText('City').value).toBe('Portland');
    expect(addPanel.getByLabelText('State').value).toBe('OR');
    expect(addPanel.getByLabelText('ZIP').value).toBe('97205');
    expect(addPanel.getByLabelText('Latitude').value).toBe('45.5231');
    expect(addPanel.getByLabelText('Longitude').value).toBe('-122.6765');
    expect(addPanel.getByLabelText('Website').value).toBe('https://cueclub.example');
    expect(addPanel.getByLabelText('Phone').value).toBe('(503) 555-0101');
    expect(addPanel.getByText('Cue Club populated from OpenStreetMap.')).toBeTruthy();
  });

  it('requires a fresh mapped address when address fields change after lookup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            osm_type: 'node',
            osm_id: 102,
            name: 'Proof Rack',
            display_name: 'Proof Rack, 700 Rack Ave, Austin, Texas, 78701, United States',
            lat: '30.2672',
            lon: '-97.7431',
            boundingbox: ['30.2668', '30.2676', '-97.7435', '-97.7427'],
            address: {
              house_number: '700',
              road: 'Rack Ave',
              city: 'Austin',
              state: 'Texas',
              postcode: '78701',
            },
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /use my location/i }));

    const addPanel = within(screen.getByRole('heading', { name: 'Add New Venue' }).closest('section'));
    await user.clear(addPanel.getByLabelText('Venue Name'));
    await user.type(addPanel.getByLabelText('Venue Name'), 'Proof Rack');
    await user.click(addPanel.getByRole('button', { name: /find venue/i }));
    await user.click(await addPanel.findByRole('button', { name: /Proof Rack/i }));

    await waitFor(() => expect(addPanel.getByRole('button', { name: /add venue/i }).disabled).toBe(false));
    await user.clear(addPanel.getByLabelText('Address'));
    await user.type(addPanel.getByLabelText('Address'), '999 Fake Ave');

    expect(addPanel.getByRole('button', { name: /add venue/i }).disabled).toBe(true);
    expect(addPanel.getByText('Select a mapped address result before adding reports or voting.')).toBeTruthy();
  });

  it('keeps description and tips as single-line SMS-length fact submissions', () => {
    render(<App />);

    const addPanel = within(screen.getByRole('heading', { name: 'Add New Venue' }).closest('section'));
    const addTips = addPanel.getByLabelText('Tips & Tricks');
    const addDescription = addPanel.getByLabelText('Short Description');

    expect(addTips.tagName).toBe('INPUT');
    expect(addTips.getAttribute('maxlength')).toBe('160');
    expect(addDescription.tagName).toBe('INPUT');
    expect(addDescription.getAttribute('maxlength')).toBe('160');

    const details = screen.getByRole('heading', { name: 'Thee Stork Club' }).closest('section');
    const detailPanel = within(details);
    const reportDescription = detailPanel.getByLabelText('Description');
    const reportTips = detailPanel.getByLabelText('Tips & Tricks');

    expect(reportDescription.tagName).toBe('INPUT');
    expect(reportDescription.getAttribute('maxlength')).toBe('160');
    expect(reportTips.tagName).toBe('INPUT');
    expect(reportTips.getAttribute('maxlength')).toBe('160');
  });

  it('adds a venue with user-entered table, cost, crowd, and busy-time intel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            osm_type: 'node',
            osm_id: 101,
            name: 'Rail House Billiards',
            display_name: 'Rail House Billiards, 700 Rack Ave, Austin, Texas, 78701, United States',
            lat: '30.2672',
            lon: '-97.7431',
            boundingbox: ['30.2668', '30.2676', '-97.7435', '-97.7427'],
            address: {
              house_number: '700',
              road: 'Rack Ave',
              city: 'Austin',
              state: 'Texas',
              postcode: '78701',
            },
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /use my location/i }));

    const addPanel = within(screen.getByRole('heading', { name: 'Add New Venue' }).closest('section'));

    await user.clear(addPanel.getByLabelText('Venue Name'));
    await user.type(addPanel.getByLabelText('Venue Name'), 'Rail House Billiards');
    await user.click(addPanel.getByRole('button', { name: /find venue/i }));
    await user.click(await addPanel.findByRole('button', { name: /Rail House Billiards/i }));
    await user.selectOptions(addPanel.getByLabelText('Venue Type'), 'Pool Bar');
    await user.clear(addPanel.getByLabelText('Tables'));
    await user.type(addPanel.getByLabelText('Tables'), '14');
    await user.selectOptions(addPanel.getByLabelText('Vibe'), 'Divey');
    await user.clear(addPanel.getByLabelText('Table Cost'));
    await user.type(addPanel.getByLabelText('Table Cost'), '$9/hr happy hour');
    await user.clear(addPanel.getByLabelText('Drinks'));
    await user.type(addPanel.getByLabelText('Drinks'), '$3 Lone Star');
    await user.selectOptions(addPanel.getByLabelText('Crowd Level'), 'Packed');
    await user.selectOptions(addPanel.getByLabelText('Crowd Day'), 'Friday');
    await user.selectOptions(addPanel.getByLabelText('Crowd Time'), '8-11');
    await user.click(addPanel.getByRole('button', { name: /add crowd window/i }));
    await user.selectOptions(addPanel.getByLabelText('Crowd Level'), 'Quiet');
    await user.selectOptions(addPanel.getByLabelText('Crowd Day'), 'Sunday');
    await user.selectOptions(addPanel.getByLabelText('Crowd Time'), 'open-5');
    await user.clear(addPanel.getByLabelText('Crowded When'));
    await user.type(addPanel.getByLabelText('Crowded When'), 'Saturday after 10 PM');
    await user.clear(addPanel.getByLabelText('Best Times To Go'));
    await user.type(addPanel.getByLabelText('Best Times To Go'), 'Sunday afternoon');
    await user.type(addPanel.getByLabelText('Tips & Tricks'), 'Back tables roll straighter.');
    await user.click(addPanel.getByLabelText('Beer'));
    await user.type(addPanel.getByLabelText('Amenity Notes'), 'Patio tables');

    await user.click(addPanel.getByRole('button', { name: /add venue/i }));

    expect(await screen.findByText('Rail House Billiards added with a community report.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Rail House Billiards' })).toBeTruthy();
    expect(screen.getAllByText('$9/hr happy hour').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$3 Lone Star').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Saturday after 10 PM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sunday afternoon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Back tables roll straighter.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Friday 8-11: Packed from 1 reports')).toBeTruthy();
    expect(screen.getByLabelText('Sunday Open-5: Quiet from 1 reports')).toBeTruthy();

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      expect(saved[0]).toMatchObject({
        name: 'Rail House Billiards',
        type: 'Pool Bar',
        tableCount: 14,
        vibe: 'Divey',
        tableRate: '$9/hr happy hour',
        drinkCost: '$3 Lone Star',
        crowdLevel: 'Quiet',
        busyTimes: 'Saturday after 10 PM',
        bestTimes: 'Sunday afternoon',
        tips: 'Back tables roll straighter.',
        amenities: 'Beer, Patio tables',
        accuracyVotes: expect.objectContaining({
          up: 0,
          down: 0,
          locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
        }),
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(saved[0].reports[0]).toMatchObject({
        reporter: 'Anonymous community report',
        name: 'Rail House Billiards',
        type: 'Pool Bar',
        address: '700 Rack Ave',
        city: 'Austin',
        state: 'TX',
        countryCode: 'US',
        tableCount: '14',
        tableRate: '$9/hr happy hour',
        drinkCost: '$3 Lone Star',
        crowdLevel: 'Quiet',
        busyTimes: 'Saturday after 10 PM',
        bestTimes: 'Sunday afternoon',
        tips: 'Back tables roll straighter.',
        amenities: 'Beer, Patio tables',
        votes: expect.objectContaining({
          up: 0,
          down: 0,
          locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
        }),
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(saved[0].reports[0].crowdSlots[0]).toMatchObject({
        day: 'Friday',
        timeBucket: '8-11',
        crowdLevel: 'Packed',
        votes: expect.objectContaining({
          up: 0,
          down: 0,
          locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
        }),
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(saved[0].reports[0].crowdSlots[1]).toMatchObject({
        day: 'Sunday',
        timeBucket: 'open-5',
        crowdLevel: 'Quiet',
        votes: expect.objectContaining({
          up: 0,
          down: 0,
          locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
        }),
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(saved[0].locationProof).not.toHaveProperty('lat');
      expect(saved[0].locationProof).not.toHaveProperty('lng');
      expect(saved[0].mapsUrl).toContain('openstreetmap.org');
    });
  });

  it('lets anonymous users mark venues and submissions inaccurate', async () => {
    useVoteTestVenue();
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: /use my location/i }));

    const details = screen.getByRole('heading', { name: 'Breaktime Billiards' }).closest('section');
    const detailPanel = within(details);

    await user.click(detailPanel.getByRole('button', { name: /^inaccurate$/i }));
    expect(screen.getAllByText('Likely inaccurate').length).toBeGreaterThan(0);

    expect(detailPanel.getByRole('heading', { name: 'Contact' })).toBeTruthy();
    expect(detailPanel.getByRole('heading', { name: 'Cost' })).toBeTruthy();
    await user.click(detailPanel.getByRole('button', { name: /^downvote phone$/i }));
    await user.click(detailPanel.getByRole('button', { name: /downvote table cost/i }));
    await user.click(detailPanel.getByRole('button', { name: /downvote crowd timing Friday 8-11/i }));

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      const breaktime = saved.find((venue) => venue.id === 'breaktime-billiards');
      expect(breaktime.accuracyVotes).toMatchObject({
        up: 0,
        down: 1,
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(breaktime.reports[0].fieldVotes.tableRate).toMatchObject({
        up: 0,
        down: 1,
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(breaktime.fieldSubmissions.find((submission) => submission.fieldKey === 'phone').votes).toMatchObject({
        up: 0,
        down: 1,
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(breaktime.reports[0].crowdSlots[0].votes).toMatchObject({
        up: 0,
        down: 1,
        locationProof: expect.objectContaining({ addressVerified: true, method: 'address-bounds' }),
      });
      expect(JSON.stringify(breaktime)).not.toContain('userVote');
      expect(JSON.parse(window.localStorage.getItem(VOTE_RECEIPTS_KEY))).toMatchObject({
        'venue:breaktime-billiards': 'down',
        'field:breaktime-billiards:field-breaktime-billiards-base-phone:phone': 'down',
        'field:breaktime-billiards:report-breaktime-1:tableRate': 'down',
        'crowd:breaktime-billiards:report-breaktime-1:crowd-report-breaktime-1-Friday-8-11': 'down',
      });
    });

    unmount();
    render(<App />);
    const reloadedDetails = screen.getByRole('heading', { name: 'Breaktime Billiards' }).closest('section');
    const reloadedPanel = within(reloadedDetails);
    const reloadedTableCostDownvote = reloadedPanel.getByRole('button', { name: /downvote table cost/i });
    expect(reloadedTableCostDownvote.getAttribute('aria-pressed')).toBe('true');
    expect(reloadedTableCostDownvote.textContent).toContain('1');
  });

  it('requires being at the venue location before voting', () => {
    useVoteTestVenue();
    render(<App />);

    const details = screen.getByRole('heading', { name: 'Breaktime Billiards' }).closest('section');
    const detailPanel = within(details);

    expect(detailPanel.getByRole('button', { name: /^inaccurate$/i }).disabled).toBe(true);
    expect(
      detailPanel.getAllByText('Use My Location while you are inside this venue address to add reports or vote.').length,
    ).toBeGreaterThan(0);
  });

  it('rejects votes near the pin but outside the mapped address bounds', async () => {
    useVoteTestVenue();
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 30.268, longitude: -97.7431 } }),
        ),
      },
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /use my location/i }));

    const details = screen.getByRole('heading', { name: 'Breaktime Billiards' }).closest('section');
    const detailPanel = within(details);

    expect(detailPanel.getByRole('button', { name: /^inaccurate$/i }).disabled).toBe(true);
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      const breaktime = saved.find((venue) => venue.id === 'breaktime-billiards');
      expect(breaktime.accuracyVotes?.down || 0).toBe(0);
    });
  });
});
