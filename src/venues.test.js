import { describe, expect, it } from 'vitest';
import { filterVenues } from './App.jsx';
import { mergeReportIntoVenue } from './venues.js';

describe('venue intelligence workflow helpers', () => {
  it('filters venues by user-centric cost, crowd, city, and type fields', () => {
    const venues = [
      {
        id: 'cheap-steady-hall',
        name: 'Cheap Steady Hall',
        type: 'Pool Hall',
        city: 'Austin',
        state: 'TX',
        vibe: 'Chill',
        tableRate: '$8/hr before 6 PM',
        drinkCost: '$3 soda',
        crowdLevel: 'Steady',
        busyTimes: 'League night Wednesday',
        description: 'Budget practice tables',
        reports: [{ id: 'new' }, { id: 'old' }],
      },
      {
        id: 'packed-bar',
        name: 'Packed Bar',
        type: 'Pool Bar',
        city: 'Austin',
        state: 'TX',
        vibe: 'Lively',
        tableRate: '$2/game',
        drinkCost: '$9 cocktails',
        crowdLevel: 'Packed',
        busyTimes: 'Friday late night',
        description: 'Loud sports bar',
        reports: [{ id: 'one' }],
      },
      {
        id: 'dallas-hall',
        name: 'Dallas Hall',
        type: 'Pool Hall',
        city: 'Dallas',
        state: 'TX',
        vibe: 'Serious Play',
        tableRate: '$8/hr before 6 PM',
        drinkCost: '$4 beer',
        crowdLevel: 'Steady',
        busyTimes: 'Saturday tournaments',
        description: 'North Texas tables',
        reports: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
      },
    ];

    const filtered = filterVenues(venues, {
      query: '$8/hr',
      city: 'aus',
      type: 'Pool Hall',
      crowdLevel: 'Steady',
    });

    expect(filtered.map((venue) => venue.id)).toEqual(['cheap-steady-hall']);
  });

  it('merges a new community report into the displayed venue intel', () => {
    const originalVenue = {
      id: 'breaktime',
      tableCount: 8,
      vibe: 'Chill',
      tableRate: '$12/hr',
      drinkCost: '$6 beer',
      crowdLevel: 'Steady',
      busyTimes: 'Friday after 8 PM',
      amenities: ['Beer', 'Parking'],
      reports: [{ id: 'older-report', tableRate: '$12/hr' }],
    };
    const report = {
      id: 'latest-report',
      tableCount: 10,
      vibe: 'Serious Play',
      tableRate: '$15/hr weekends',
      drinkCost: '$5 tallboys',
      crowdLevel: 'Packed',
      busyTimes: 'Tournament Tuesdays after 7 PM',
      amenities: ['Beer', 'Tournaments'],
    };

    const merged = mergeReportIntoVenue(originalVenue, report);

    expect(merged).toMatchObject({
      tableCount: 10,
      vibe: 'Serious Play',
      tableRate: '$15/hr weekends',
      drinkCost: '$5 tallboys',
      crowdLevel: 'Packed',
      busyTimes: 'Tournament Tuesdays after 7 PM',
      amenities: ['Beer', 'Tournaments'],
    });
    expect(merged.reports.map((item) => item.id)).toEqual(['latest-report', 'older-report']);
    expect(originalVenue.tableRate).toBe('$12/hr');
  });

  it('keeps existing venue intel when a report omits optional fields', () => {
    const merged = mergeReportIntoVenue(
      {
        id: 'bank-shot',
        tableCount: 12,
        vibe: 'Serious Play',
        tableRate: '$10/hr daytime',
        drinkCost: '$4 soda',
        crowdLevel: 'Quiet',
        busyTimes: 'Easy table access',
        amenities: ['Lessons'],
      },
      {
        id: 'partial-report',
        tableCount: '',
        vibe: '',
        tableRate: '',
        drinkCost: '',
        crowdLevel: '',
        busyTimes: '',
        amenities: [],
      },
    );

    expect(merged).toMatchObject({
      tableCount: 12,
      vibe: 'Serious Play',
      tableRate: '$10/hr daytime',
      drinkCost: '$4 soda',
      crowdLevel: 'Quiet',
      busyTimes: 'Easy table access',
      amenities: ['Lessons'],
    });
    expect(merged.reports[0].id).toBe('partial-report');
  });
});
