import { describe, expect, it } from 'vitest';
import { filterVenues } from './App.jsx';
import {
  applyCrowdSlotVote,
  applyReportVote,
  applyFieldVote,
  applyVenueVote,
  createCrowdReportsFromReport,
  createFieldSubmissionsFromVenue,
  formatAmenityLine,
  getAmenityList,
  getCurrentCrowdInsight,
  getDistanceLabel,
  getDistanceMeters,
  getCrowdHistogram,
  getFieldConfidence,
  getFieldConsensus,
  mergeReportIntoVenue,
} from './venues.js';

describe('venue intelligence workflow helpers', () => {
  const proof = {
    addressVerified: true,
    verifiedAt: '2026-06-01T00:00:00.000Z',
    method: 'address-bounds',
    distanceMeters: 12,
  };

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
      bestTimes: 'Sunday open tables',
      tips: 'Ask for the back room tables.',
      amenities: ['Beer', 'Tournaments'],
      locationProof: proof,
    };

    const merged = mergeReportIntoVenue(originalVenue, report);

    expect(merged).toMatchObject({
      tableCount: 10,
      vibe: 'Serious Play',
      tableRate: '$15/hr weekends',
      drinkCost: '$5 tallboys',
      crowdLevel: 'Packed',
      busyTimes: 'Tournament Tuesdays after 7 PM',
      bestTimes: 'Sunday open tables',
      amenities: 'Beer, Tournaments',
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
        locationProof: proof,
      },
    );

    expect(merged).toMatchObject({
      tableCount: 12,
      vibe: 'Serious Play',
      tableRate: '$10/hr daytime',
      drinkCost: '$4 soda',
      crowdLevel: 'Quiet',
      busyTimes: 'Easy table access',
      amenities: 'Lessons',
    });
    expect(merged.reports[0].id).toBe('partial-report');
  });

  it('treats amenities as a short voteable line while rendering tag lists', () => {
    expect(formatAmenityLine(['Beer', 'Patio seating', 'Darts'])).toBe('Beer, Patio seating, Darts');
    expect(getAmenityList('Beer, Patio seating, Darts')).toEqual(['Beer', 'Patio seating', 'Darts']);

    const venue = {
      id: 'amenity-consensus',
      amenities: 'Beer',
      reports: [
        {
          id: 'trusted',
          amenities: 'Beer, Patio seating',
          fieldVotes: { amenities: { up: 2, down: 0 } },
        },
        {
          id: 'disputed',
          amenities: 'Beer, Arcade',
          fieldVotes: { amenities: { up: 0, down: 2 } },
        },
      ],
    };

    expect(getFieldConsensus(venue, 'amenities')).toMatchObject({
      value: 'Beer, Patio seating',
      confidence: 'high',
    });
  });

  it('creates voteable identity and contact submissions from venue-level facts', () => {
    const venue = {
      id: 'identity-facts',
      name: 'Rack Room',
      type: 'Pool Hall',
      address: '10 Cue St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      countryCode: 'US',
      phoneType: 'Reservations',
      phone: '(512) 555-0000',
      website: 'rack.example',
      mapsUrl: 'https://www.openstreetmap.org/?mlat=30&mlon=-97',
    };

    const submissions = createFieldSubmissionsFromVenue(venue);
    expect(submissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'field-identity-facts-base-name', fieldKey: 'name', value: 'Rack Room' }),
        expect.objectContaining({ fieldKey: 'address', value: '10 Cue St' }),
        expect.objectContaining({ fieldKey: 'phone', value: '(512) 555-0000' }),
        expect.objectContaining({ fieldKey: 'website', value: 'rack.example' }),
      ]),
    );

    const withSubmissions = { ...venue, fieldSubmissions: submissions };
    const downvoted = applyFieldVote(withSubmissions, 'field-identity-facts-base-phone', 'phone', 'down', proof);
    expect(downvoted.fieldSubmissions.find((submission) => submission.fieldKey === 'phone').votes).toMatchObject({
      down: 1,
      locationProof: proof,
    });
  });

  it('toggles venue and report accuracy votes anonymously', () => {
    const venue = {
      id: 'not-real',
      accuracyVotes: { up: 0, down: 0 },
      reports: [{ id: 'report-1', votes: { up: 0, down: 0 } }],
    };

    const downvotedVenue = applyVenueVote(venue, 'down', proof);
    expect(downvotedVenue.accuracyVotes).toMatchObject({
      up: 0,
      down: 1,
      locationProof: proof,
    });

    const changedVenueVote = applyVenueVote(downvotedVenue, 'up', proof, 'down');
    expect(changedVenueVote.accuracyVotes).toMatchObject({
      up: 1,
      down: 0,
      locationProof: proof,
    });

    const reportDownvoted = applyReportVote(venue, 'report-1', 'down', proof);
    expect(reportDownvoted.reports[0].votes).toMatchObject({
      up: 0,
      down: 1,
      locationProof: proof,
    });
  });

  it('counts a new anonymous vote even if legacy shared data contains userVote', () => {
    const venue = {
      id: 'legacy-shared-vote',
      accuracyVotes: { up: 0, down: 1, userVote: 'down' },
    };

    expect(applyVenueVote(venue, 'down', proof).accuracyVotes).toMatchObject({
      up: 0,
      down: 2,
      locationProof: proof,
    });
    expect(applyVenueVote(venue, 'down', proof, 'down').accuracyVotes).toMatchObject({
      up: 0,
      down: 0,
      locationProof: proof,
    });
  });

  it('refuses vote mutations without an in-address location proof', () => {
    const venue = {
      id: 'not-real',
      accuracyVotes: { up: 0, down: 0 },
      reports: [{ id: 'report-1', votes: { up: 0, down: 0 } }],
    };

    expect(applyVenueVote(venue, 'down')).toBe(venue);
    expect(applyReportVote(venue, 'report-1', 'down')).toBe(venue);
  });

  it('reports field confidence from matching community submissions', () => {
    const confidence = getFieldConfidence(
      {
        tableRate: '$12/hr',
        reports: [
          { id: 'one', tableRate: '$12/hr' },
          { id: 'two', tableRate: '$12/hr' },
          { id: 'three', tableRate: '$15/hr' },
        ],
      },
      'tableRate',
    );

    expect(confidence).toMatchObject({
      label: 'Table cost',
      value: '$12/hr',
      support: 2,
      reportCount: 3,
      level: 'medium',
    });
  });

  it('uses field-level votes to pick consensus instead of the newest report', () => {
    const venue = {
      id: 'vote-weighted',
      tableRate: '$20/hr newest',
      reports: [
        {
          id: 'newest',
          tableRate: '$20/hr newest',
          fieldVotes: { tableRate: { up: 0, down: 2 } },
        },
        {
          id: 'older',
          tableRate: '$12/hr trusted',
          fieldVotes: { tableRate: { up: 3, down: 0 } },
        },
      ],
    };

    expect(getFieldConsensus(venue, 'tableRate')).toMatchObject({
      value: '$12/hr trusted',
      confidence: 'high',
    });
  });

  it('toggles a single field vote without changing other fields', () => {
    const venue = {
      id: 'field-votes',
      reports: [
        {
          id: 'report-1',
          tableRate: '$12/hr',
          drinkCost: '$5 beer',
          fieldVotes: {
            tableRate: { up: 0, down: 0 },
            drinkCost: { up: 0, down: 0 },
          },
        },
      ],
    };

    const updated = applyFieldVote(venue, 'report-1', 'tableRate', 'up', proof);

    expect(updated.reports[0].fieldVotes.tableRate).toMatchObject({
      up: 1,
      down: 0,
      locationProof: proof,
    });
    expect(updated.reports[0].fieldVotes.drinkCost).toEqual({ up: 0, down: 0 });
  });

  it('normalizes valid crowd timing slots and ignores invalid ones', () => {
    const slots = createCrowdReportsFromReport({
      id: 'report-1',
      createdAt: 'Now',
      crowdSlots: [
        { day: 'Friday', timeBucket: '8-11', crowdLevel: 'Packed' },
        { day: 'Funday', timeBucket: '8-11', crowdLevel: 'Packed' },
        { day: 'Saturday', timeBucket: 'nope', crowdLevel: 'Packed' },
        { day: 'Saturday', timeBucket: '8-11', crowdLevel: 'Crushed' },
      ],
    });

    expect(slots).toEqual([
      expect.objectContaining({
        id: 'crowd-report-1-Friday-8-11',
        day: 'Friday',
        timeBucket: '8-11',
        crowdLevel: 'Packed',
        votes: { up: 0, down: 0 },
      }),
    ]);
  });

  it('recalculates crowd heatmap cells from vote-weighted crowd timing reports', () => {
    const venue = {
      id: 'crowd-votes',
      reports: [
        {
          id: 'trusted',
          crowdSlots: [
            {
              id: 'trusted-slot',
              day: 'Friday',
              timeBucket: '8-11',
              crowdLevel: 'Packed',
              votes: { up: 2, down: 0 },
            },
          ],
        },
        {
          id: 'disputed',
          crowdSlots: [
            {
              id: 'disputed-slot',
              day: 'Friday',
              timeBucket: '8-11',
              crowdLevel: 'Quiet',
              votes: { up: 0, down: 3 },
            },
          ],
        },
      ],
    };

    const friday = getCrowdHistogram(venue).find((row) => row.day === 'Friday');
    const evening = friday.cells.find((cell) => cell.timeBucket === '8-11');

    expect(evening).toMatchObject({
      crowdLevel: 'Packed',
      count: 1,
      support: 3,
    });
  });

  it('aggregates multiple crowd windows from one anonymous report', () => {
    const venue = {
      id: 'multi-window',
      reports: [
        {
          id: 'report-1',
          crowdSlots: [
            { day: 'Friday', timeBucket: '8-11', crowdLevel: 'Packed' },
            { day: 'Sunday', timeBucket: 'open-5', crowdLevel: 'Quiet' },
          ],
        },
      ],
    };

    const histogram = getCrowdHistogram(venue);
    const fridayEvening = histogram
      .find((row) => row.day === 'Friday')
      .cells.find((cell) => cell.timeBucket === '8-11');
    const sundayOpen = histogram
      .find((row) => row.day === 'Sunday')
      .cells.find((cell) => cell.timeBucket === 'open-5');

    expect(fridayEvening).toMatchObject({ crowdLevel: 'Packed', count: 1 });
    expect(sundayOpen).toMatchObject({ crowdLevel: 'Quiet', count: 1 });
  });

  it('toggles a single crowd timing vote and changes the heatmap aggregate', () => {
    const venue = {
      id: 'slot-votes',
      reports: [
        {
          id: 'report-1',
          crowdSlots: [
            {
              id: 'slot-1',
              day: 'Friday',
              timeBucket: '8-11',
              crowdLevel: 'Packed',
              votes: { up: 0, down: 0 },
            },
          ],
        },
      ],
    };

    const downvoted = applyCrowdSlotVote(venue, 'report-1', 'slot-1', 'down', proof);
    const friday = getCrowdHistogram(downvoted).find((row) => row.day === 'Friday');
    const evening = friday.cells.find((cell) => cell.timeBucket === '8-11');

    expect(downvoted.reports[0].crowdSlots[0].votes).toMatchObject({
      up: 0,
      down: 1,
      locationProof: proof,
    });
    expect(evening).toMatchObject({
      crowdLevel: '',
      count: 0,
      support: 0,
    });
  });

  it('derives real-time crowd insight for the current day and time bucket', () => {
    const insight = getCurrentCrowdInsight(
      {
        reports: [
          {
            id: 'friday-report',
            crowdSlots: [
              {
                id: 'friday-slot',
                day: 'Friday',
                timeBucket: '8-11',
                crowdLevel: 'Packed',
                votes: { up: 1, down: 0 },
              },
            ],
          },
        ],
      },
      new Date(2026, 4, 29, 20, 30),
    );

    expect(insight).toMatchObject({
      day: 'Friday',
      timeBucket: '8-11',
      label: '8-11',
      isWeekend: true,
      crowdLevel: 'Packed',
      reportCount: 1,
    });
  });

  it('formats live distance from the current GPS position', () => {
    const meters = getDistanceMeters(
      { lat: 30.2672, lng: -97.7431 },
      { lat: 30.2621, lng: -97.7208 },
    );

    expect(meters).toBeGreaterThan(2000);
    expect(getDistanceLabel(meters)).toMatch(/mi$/);
    expect(getDistanceLabel(80)).toBe('80 m');
  });
});
