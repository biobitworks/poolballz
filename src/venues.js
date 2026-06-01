export const AMENITIES = [
  'Beer',
  'Full Bar',
  'Food',
  'Leagues',
  'Tournaments',
  'Lessons',
  'Pro Shop',
  'Parking',
  'Wi-Fi',
  'Air Conditioning',
];

export const VIBES = ['Chill', 'Lively', 'Serious Play', 'Divey', 'Family Friendly'];

export const CROWD_LEVELS = ['Quiet', 'Steady', 'Busy', 'Packed'];

export const VENUE_TYPES = ['Pool Hall', 'Pool Bar'];

export const seedVenues = [
  {
    id: 'breaktime-billiards',
    source: 'community',
    name: 'Breaktime Billiards',
    type: 'Pool Hall',
    city: 'Austin',
    state: 'TX',
    address: '123 Cue Ln',
    zip: '78701',
    lat: 30.2672,
    lng: -97.7431,
    distance: 1.2,
    tableCount: 8,
    vibe: 'Chill',
    tableRate: '$12/hr',
    drinkCost: '$6 beer',
    crowdLevel: 'Steady',
    busyTimes: 'League night Tuesday 7-10 PM; busiest Friday after 9 PM',
    hours: '11:00 AM - 2:00 AM',
    openNow: true,
    phone: '(512) 555-0198',
    website: 'breaktimebilliards.com',
    mapsUrl: 'https://www.openstreetmap.org/?mlat=30.2672&mlon=-97.7431#map=16/30.2672/-97.7431',
    description:
      'Laid-back room with maintained tables, cold drinks, and a steady local crowd.',
    amenities: ['Beer', 'Full Bar', 'Food', 'Leagues', 'Tournaments', 'Parking'],
    reports: [
      {
        id: 'report-breaktime-1',
        reporter: 'Local player',
        tableCount: 8,
        vibe: 'Chill',
        tableRate: '$12/hr',
        drinkCost: '$6 beer',
        crowdLevel: 'Steady',
        busyTimes: 'League night Tuesday 7-10 PM; busiest Friday after 9 PM',
        createdAt: 'Seed report',
      },
    ],
  },
  {
    id: 'side-pocket-bar-grill',
    source: 'community',
    name: 'Side Pocket Bar & Grill',
    type: 'Pool Bar',
    city: 'Austin',
    state: 'TX',
    address: '88 Rail St',
    zip: '78702',
    lat: 30.2621,
    lng: -97.7208,
    distance: 2.7,
    tableCount: 6,
    vibe: 'Lively',
    tableRate: '$1.50/game',
    drinkCost: '$8 mixed drinks',
    crowdLevel: 'Busy',
    busyTimes: 'Happy hour and sports nights, especially 6-11 PM',
    hours: '11:00 AM - 1:00 AM',
    openNow: true,
    phone: '(512) 555-0164',
    website: 'sidepocketaustin.com',
    mapsUrl: 'https://www.openstreetmap.org/?mlat=30.2621&mlon=-97.7208#map=16/30.2621/-97.7208',
    description:
      'Sports on the TVs, solid bar food, and a mixed crowd that gets busier after work.',
    amenities: ['Beer', 'Full Bar', 'Food', 'Parking', 'Wi-Fi'],
    reports: [
      {
        id: 'report-side-pocket-1',
        reporter: 'League captain',
        tableCount: 6,
        vibe: 'Lively',
        tableRate: '$1.50/game',
        drinkCost: '$8 mixed drinks',
        crowdLevel: 'Busy',
        busyTimes: 'Happy hour and sports nights, especially 6-11 PM',
        createdAt: 'Seed report',
      },
    ],
  },
  {
    id: 'bank-shot-billiards',
    source: 'community',
    name: 'Bank Shot Billiards',
    type: 'Pool Hall',
    city: 'Austin',
    state: 'TX',
    address: '420 Masse Ave',
    zip: '78704',
    lat: 30.2447,
    lng: -97.7469,
    distance: 4.3,
    tableCount: 12,
    vibe: 'Serious Play',
    tableRate: '$10/hr daytime',
    drinkCost: '$4 soda, $5 beer',
    crowdLevel: 'Quiet',
    busyTimes: 'Tournaments Saturday afternoon; otherwise easy table access',
    hours: '12:00 PM - 12:00 AM',
    openNow: true,
    phone: '(512) 555-0142',
    website: 'bankshotatx.com',
    mapsUrl: 'https://www.openstreetmap.org/?mlat=30.2447&mlon=-97.7469#map=16/30.2447/-97.7469',
    description:
      'Tournament-friendly hall with plenty of tables, clean rails, and a quieter daytime scene.',
    amenities: ['Beer', 'Leagues', 'Tournaments', 'Lessons', 'Pro Shop', 'Parking'],
    reports: [
      {
        id: 'report-bank-shot-1',
        reporter: 'Tournament regular',
        tableCount: 12,
        vibe: 'Serious Play',
        tableRate: '$10/hr daytime',
        drinkCost: '$4 soda, $5 beer',
        crowdLevel: 'Quiet',
        busyTimes: 'Tournaments Saturday afternoon; otherwise easy table access',
        createdAt: 'Seed report',
      },
    ],
  },
  {
    // Verified from OpenStreetMap (way/36979364): tagged amenity=bar with
    // sport=billiards, confirming it is a real pool bar. Only OSM-sourced facts
    // are filled in here; pool-specific details are left blank for community
    // reports rather than fabricated.
    id: 'thee-stork-club',
    source: 'OpenStreetMap',
    name: 'Thee Stork Club',
    type: 'Pool Bar',
    city: 'Oakland',
    state: 'CA',
    address: '2330 Telegraph Ave',
    zip: '94612',
    lat: 37.8131364,
    lng: -122.2683848,
    distance: 0,
    tableCount: null,
    vibe: '',
    tableRate: '',
    drinkCost: '',
    crowdLevel: '',
    busyTimes: '',
    hours: '4:00 PM - 2:00 AM',
    openNow: false,
    phone: '',
    website: 'theestorkclub.com',
    mapsUrl:
      'https://www.openstreetmap.org/?mlat=37.8131364&mlon=-122.2683848#map=16/37.8131364/-122.2683848',
    description:
      'Oakland bar with billiards, imported from OpenStreetMap. Table count, rates, vibe, and busy times need community reports.',
    amenities: ['Full Bar'],
    reports: [],
  },
];

export function createVenueId(name) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
}

export function createReportId() {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createOpenStreetMapUrl(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return 'https://www.openstreetmap.org/';
  }
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

export function mergeReportIntoVenue(venue, report) {
  const reports = [report, ...(venue.reports || [])];
  return {
    ...venue,
    tableCount: Number(report.tableCount) || venue.tableCount,
    vibe: report.vibe || venue.vibe,
    tableRate: report.tableRate || venue.tableRate,
    drinkCost: report.drinkCost || venue.drinkCost,
    crowdLevel: report.crowdLevel || venue.crowdLevel,
    busyTimes: report.busyTimes || venue.busyTimes,
    amenities: report.amenities?.length ? report.amenities : venue.amenities,
    reports,
  };
}
