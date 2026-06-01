import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { STORAGE_KEY } from './storage.js';

describe('Poolballz app venue submission', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
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

  it('adds a venue with user-entered table, cost, crowd, and busy-time intel', async () => {
    const user = userEvent.setup();
    render(<App />);

    const addPanel = within(screen.getByRole('heading', { name: 'Add New Venue' }).closest('section'));

    await user.clear(addPanel.getByLabelText('Venue Name'));
    await user.type(addPanel.getByLabelText('Venue Name'), 'Rail House Billiards');
    await user.selectOptions(addPanel.getByLabelText('Venue Type'), 'Pool Bar');
    await user.clear(addPanel.getByLabelText('Address'));
    await user.type(addPanel.getByLabelText('Address'), '700 Rack Ave');
    await user.clear(addPanel.getByLabelText('Tables'));
    await user.type(addPanel.getByLabelText('Tables'), '14');
    await user.selectOptions(addPanel.getByLabelText('Vibe'), 'Divey');
    await user.clear(addPanel.getByLabelText('Table Cost'));
    await user.type(addPanel.getByLabelText('Table Cost'), '$9/hr happy hour');
    await user.clear(addPanel.getByLabelText('Drinks'));
    await user.type(addPanel.getByLabelText('Drinks'), '$3 Lone Star');
    await user.selectOptions(addPanel.getByLabelText('Crowd Level'), 'Packed');
    await user.clear(addPanel.getByLabelText('Crowded When'));
    await user.type(addPanel.getByLabelText('Crowded When'), 'Saturday after 10 PM');

    await user.click(addPanel.getByRole('button', { name: /add venue/i }));

    expect(await screen.findByText('Rail House Billiards added with a community report.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Rail House Billiards' })).toBeTruthy();
    expect(screen.getByText('$9/hr happy hour')).toBeTruthy();
    expect(screen.getByText('$3 Lone Star')).toBeTruthy();
    expect(screen.getAllByText('Saturday after 10 PM').length).toBeGreaterThan(0);

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      expect(saved[0]).toMatchObject({
        name: 'Rail House Billiards',
        type: 'Pool Bar',
        tableCount: 14,
        vibe: 'Divey',
        tableRate: '$9/hr happy hour',
        drinkCost: '$3 Lone Star',
        crowdLevel: 'Packed',
        busyTimes: 'Saturday after 10 PM',
      });
      expect(saved[0].reports[0]).toMatchObject({
        reporter: 'Community member',
        tableCount: '14',
        tableRate: '$9/hr happy hour',
        drinkCost: '$3 Lone Star',
        crowdLevel: 'Packed',
        busyTimes: 'Saturday after 10 PM',
      });
      expect(saved[0].mapsUrl).toContain('openstreetmap.org');
    });
  });
});
