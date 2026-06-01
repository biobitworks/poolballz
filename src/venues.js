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

export const COUNTRY_OPTIONS = [
  { code: 'US', label: 'United States', currency: 'USD' },
  { code: 'CA', label: 'Canada', currency: 'CAD' },
  { code: 'GB', label: 'United Kingdom', currency: 'GBP' },
  { code: 'AU', label: 'Australia', currency: 'AUD' },
  { code: 'NZ', label: 'New Zealand', currency: 'NZD' },
  { code: 'IE', label: 'Ireland', currency: 'EUR' },
  { code: 'DE', label: 'Germany', currency: 'EUR' },
  { code: 'FR', label: 'France', currency: 'EUR' },
  { code: 'ES', label: 'Spain', currency: 'EUR' },
  { code: 'MX', label: 'Mexico', currency: 'MXN' },
  { code: 'JP', label: 'Japan', currency: 'JPY' },
  { code: 'PH', label: 'Philippines', currency: 'PHP' },
];

export const CURRENCY_OPTIONS = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD', 'MXN', 'JPY', 'PHP'];

export const PHONE_TYPES = ['Main', 'Mobile', 'WhatsApp', 'Reservations', 'League Contact'];

export const ACCESSIBILITY_OPTIONS = ['Yes', 'No', 'Partial', 'Unknown'];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TIME_BUCKETS = [
  { key: 'open-5', label: 'Open-5' },
  { key: '5-8', label: '5-8' },
  { key: '8-11', label: '8-11' },
  { key: '11-close', label: '11-close' },
];

export const CROWD_LEVEL_SCORE = {
  Quiet: 1,
  Steady: 2,
  Busy: 3,
  Packed: 4,
};

export const CONFIDENCE_FIELDS = [
  { key: 'name', label: 'Venue name', fallback: 'Unnamed venue', maxLength: 160, group: 'identity' },
  { key: 'type', label: 'Venue type', fallback: 'Venue', maxLength: 80, group: 'identity' },
  { key: 'address', label: 'Address', fallback: 'No address yet', maxLength: 160, group: 'location' },
  { key: 'city', label: 'City', fallback: 'No city yet', maxLength: 100, group: 'location' },
  { key: 'state', label: 'Region', fallback: 'No region yet', maxLength: 100, group: 'location' },
  { key: 'zip', label: 'Postal code', fallback: 'No postal code yet', maxLength: 40, group: 'location' },
  { key: 'countryCode', label: 'Country', fallback: 'No country yet', maxLength: 2, group: 'location' },
  { key: 'mapsUrl', label: 'Map URL', fallback: 'No map URL yet', maxLength: 220, group: 'location' },
  { key: 'phoneType', label: 'Phone type', fallback: 'No phone type yet', maxLength: 80, group: 'contact' },
  { key: 'phone', label: 'Phone', fallback: 'No phone yet', maxLength: 80, group: 'contact' },
  { key: 'website', label: 'Website', fallback: 'No website yet', maxLength: 160, group: 'contact' },
  { key: 'tableCount', label: 'Tables', fallback: '?', maxLength: 20, group: 'play' },
  { key: 'vibe', label: 'Vibe', fallback: 'No vibe yet', maxLength: 160, group: 'play' },
  { key: 'tableRate', label: 'Table cost', fallback: 'No rate yet', maxLength: 160, group: 'cost' },
  { key: 'currencyCode', label: 'Currency', fallback: 'No currency yet', maxLength: 3, group: 'cost' },
  { key: 'drinkCost', label: 'Drinks', fallback: 'No drink intel yet', maxLength: 160, group: 'cost' },
  { key: 'crowdLevel', label: 'Crowd level', fallback: 'No crowd intel yet', maxLength: 80, group: 'crowd' },
  { key: 'busyTimes', label: 'Crowded when', fallback: 'No busy-time intel yet', maxLength: 160, group: 'crowd' },
  { key: 'bestTimes', label: 'Best times', fallback: 'No best-time tips yet', maxLength: 160, group: 'crowd' },
  { key: 'hours', label: 'Hours', fallback: 'No hours yet', maxLength: 160, group: 'venue' },
  { key: 'amenities', label: 'Amenities', fallback: 'No amenities yet', maxLength: 160, group: 'venue' },
  { key: 'description', label: 'Description', fallback: 'No description yet', maxLength: 160, group: 'venue' },
  { key: 'tips', label: 'Tips', fallback: 'No tips yet', maxLength: 160, group: 'tips' },
  { key: 'accessibility', label: 'Accessibility', fallback: 'No accessibility notes yet', maxLength: 160, group: 'access' },
  { key: 'stepFreeEntrance', label: 'Step-free entrance', fallback: 'Unknown step-free entrance', maxLength: 20, group: 'access' },
  { key: 'accessibleRestroom', label: 'Accessible restroom', fallback: 'Unknown restroom access', maxLength: 20, group: 'access' },
  { key: 'accessibleParking', label: 'Accessible parking', fallback: 'Unknown accessible parking', maxLength: 20, group: 'access' },
  { key: 'stairs', label: 'Stairs', fallback: 'Unknown stairs', maxLength: 80, group: 'access' },
  { key: 'elevator', label: 'Elevator', fallback: 'Unknown elevator', maxLength: 80, group: 'access' },
  { key: 'idRequirement', label: 'ID', fallback: 'No ID info yet', maxLength: 80, group: 'policy' },
  { key: 'ageRange', label: 'Age range', fallback: 'No age info yet', maxLength: 80, group: 'policy' },
];

export const FIELD_SUBMISSION_KEYS = CONFIDENCE_FIELDS.map((field) => field.key);
export const VENUE_BASE_FIELD_KEYS = [
  'name',
  'type',
  'address',
  'city',
  'state',
  'zip',
  'countryCode',
  'mapsUrl',
  'phoneType',
  'phone',
  'website',
];

export const seedVenues = [
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
    countryCode: 'US',
    currencyCode: 'USD',
    lat: 37.8131364,
    lng: -122.2683848,
    boundingBox: { south: 37.8127, north: 37.8136, west: -122.2688, east: -122.2679 },
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

export function createSubmissionId(prefix = 'submission') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeLocationProof(proof = {}) {
  if (!proof || proof.addressVerified !== true) return null;
  const verifiedAt = typeof proof.verifiedAt === 'string' && proof.verifiedAt ? proof.verifiedAt : '';
  const method = proof.method === 'address-bounds' ? proof.method : '';
  if (!verifiedAt || !method) return null;

  const distanceMeters = Number(proof.distanceMeters);
  const radiusMeters = Number(proof.radiusMeters);
  return {
    addressVerified: true,
    verifiedAt,
    method,
    ...(Number.isFinite(distanceMeters) ? { distanceMeters: Math.max(0, Math.round(distanceMeters)) } : {}),
    ...(Number.isFinite(radiusMeters) ? { radiusMeters: Math.max(0, Math.round(radiusMeters)) } : {}),
  };
}

export function createAccuracyVotes(votes = {}) {
  const locationProof = normalizeLocationProof(votes.locationProof);
  return {
    up: Math.max(0, Number(votes.up) || 0),
    down: Math.max(0, Number(votes.down) || 0),
    ...(locationProof ? { locationProof } : {}),
  };
}

export function createEmptyFieldVotes(report = {}) {
  return FIELD_SUBMISSION_KEYS.reduce((votes, key) => {
    votes[key] = createAccuracyVotes(report.fieldVotes?.[key]);
    return votes;
  }, {});
}

export function normalizeFieldValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ').trim();
  return String(value ?? '').trim();
}

export function formatAmenityLine(value) {
  const items = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((item) => item.trim());
  return items
    .filter(Boolean)
    .map((item) => item.replace(/\s+/g, ' '))
    .join(', ')
    .slice(0, 160);
}

export function getAmenityList(value) {
  return formatAmenityLine(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function clampFieldValue(fieldKey, value) {
  const field = CONFIDENCE_FIELDS.find((item) => item.key === fieldKey);
  const normalized =
    fieldKey === 'amenities'
      ? formatAmenityLine(value)
      : normalizeFieldValue(value).replace(/\s+/g, ' ');
  return field?.maxLength ? normalized.slice(0, field.maxLength) : normalized;
}

export function applyVenueVote(venue, vote, locationProof, previousVote = null) {
  if (vote !== 'up' && vote !== 'down') return venue;
  const normalizedProof = normalizeLocationProof(locationProof);
  if (!normalizedProof) return venue;

  const current = createAccuracyVotes(venue.accuracyVotes);
  const next = { ...current };
  const localPreviousVote = previousVote === 'up' || previousVote === 'down' ? previousVote : null;

  if (localPreviousVote === vote) {
    next[vote] = Math.max(0, next[vote] - 1);
  } else {
    if (localPreviousVote) next[localPreviousVote] = Math.max(0, next[localPreviousVote] - 1);
    next[vote] += 1;
  }

  return {
    ...venue,
    accuracyVotes: normalizedProof ? { ...next, locationProof: normalizedProof } : next,
  };
}

export function applyFieldVote(venue, reportId, fieldKey, vote, locationProof, previousVote = null) {
  if (vote !== 'up' && vote !== 'down' || !FIELD_SUBMISSION_KEYS.includes(fieldKey)) return venue;
  if (!normalizeLocationProof(locationProof)) return venue;
  return {
    ...venue,
    reports: (venue.reports || []).map((report) => {
      if (report.id !== reportId) return report;
      const currentVotes = createEmptyFieldVotes(report);
      const updated = applyVenueVote({ accuracyVotes: currentVotes[fieldKey] }, vote, locationProof, previousVote);
      return {
        ...report,
        fieldVotes: {
          ...currentVotes,
          [fieldKey]: updated.accuracyVotes,
        },
      };
    }),
    fieldSubmissions: (venue.fieldSubmissions || []).map((submission) => {
      if (submission.id !== reportId && submission.legacyReportId !== reportId && submission.reportId !== reportId) {
        return submission;
      }
      if (submission.fieldKey !== fieldKey) return submission;
      const updated = applyVenueVote({ accuracyVotes: submission.votes }, vote, locationProof, previousVote);
      return {
        ...submission,
        votes: updated.accuracyVotes,
      };
    }),
  };
}

export function applyImageVote(venue, imageId, vote, locationProof, previousVote = null) {
  if (vote !== 'up' && vote !== 'down') return venue;
  if (!normalizeLocationProof(locationProof)) return venue;
  return {
    ...venue,
    imageSubmissions: (venue.imageSubmissions || []).map((image) => {
      if (image.id !== imageId) return image;
      const updated = applyVenueVote({ accuracyVotes: image.votes }, vote, locationProof, previousVote);
      return { ...image, votes: updated.accuracyVotes };
    }),
  };
}

export function applyCrowdSlotVote(venue, reportId, slotId, vote, locationProof, previousVote = null) {
  if (vote !== 'up' && vote !== 'down') return venue;
  if (!normalizeLocationProof(locationProof)) return venue;
  return {
    ...venue,
    reports: (venue.reports || []).map((report) => {
      if (report.id !== reportId) return report;
      return {
        ...report,
        crowdSlots: createCrowdReportsFromReport(report).map((slot) => {
          if (slot.id !== slotId) return slot;
          const updated = applyVenueVote({ accuracyVotes: slot.votes }, vote, locationProof, previousVote);
          return { ...slot, votes: updated.accuracyVotes };
        }),
      };
    }),
  };
}

export function applyReportVote(venue, reportId, vote, locationProof, previousVote = null) {
  if (vote !== 'up' && vote !== 'down') return venue;
  if (!normalizeLocationProof(locationProof)) return venue;
  return {
    ...venue,
    reports: (venue.reports || []).map((report) => {
      if (report.id !== reportId) return report;
      const updated = applyVenueVote({ accuracyVotes: report.votes }, vote, locationProof, previousVote);
      return {
        ...report,
        votes: updated.accuracyVotes,
      };
    }),
  };
}

export function createFieldSubmissionsFromVenue(venue) {
  return VENUE_BASE_FIELD_KEYS.flatMap((fieldKey) => {
    const value = clampFieldValue(fieldKey, venue[fieldKey]);
    if (!value) return [];
    return {
      id: `field-${venue.id || 'venue'}-base-${fieldKey}`,
      venueId: venue.id || '',
      reportId: null,
      legacyReportId: null,
      fieldKey,
      value,
      createdAt: venue.createdAt || 'Venue listing',
      source: venue.source || 'community',
      votes: createAccuracyVotes(venue.venueFieldVotes?.[fieldKey]),
      ...(normalizeLocationProof(venue.locationProof) ? { locationProof: normalizeLocationProof(venue.locationProof) } : {}),
    };
  });
}

export function createFieldSubmissionsFromReport(report, venueId = '') {
  const fieldVotes = createEmptyFieldVotes(report);
  const locationProof = normalizeLocationProof(report.locationProof);
  return FIELD_SUBMISSION_KEYS.flatMap((fieldKey) => {
    const value = clampFieldValue(fieldKey, report[fieldKey]);
    if (!value) return [];
    return {
      id: report.id ? `field-${report.id}-${fieldKey}` : createSubmissionId(`field-${fieldKey}`),
      venueId,
      reportId: report.id,
      legacyReportId: report.id,
      fieldKey,
      value,
      createdAt: report.createdAt || new Date().toLocaleString(),
      votes: createAccuracyVotes(fieldVotes[fieldKey]),
      ...(locationProof ? { locationProof } : {}),
    };
  });
}

export function createImageSubmissionFromReport(report, venueId = '') {
  if (!report.imageDataUrl) return null;
  const locationProof = normalizeLocationProof(report.locationProof);
  return {
    id: report.id ? `image-${report.id}` : createSubmissionId('image'),
    venueId,
    reportId: report.id,
    legacyReportId: report.id,
    dataUrl: report.imageDataUrl,
    name: report.imageName || '',
    caption: clampFieldValue('description', report.imageCaption || ''),
    createdAt: report.createdAt || new Date().toLocaleString(),
    votes: createAccuracyVotes(report.imageVotes),
    ...(locationProof ? { locationProof } : {}),
  };
}

export function createCrowdReportsFromReport(report) {
  const crowdReports = Array.isArray(report.crowdSlots)
    ? report.crowdSlots
    : Array.isArray(report.crowdReports)
      ? report.crowdReports
      : [];
  if (crowdReports.length) {
    return crowdReports
      .map((item) => {
        const day = typeof item.day === 'number' ? DAYS[item.day] : item.day;
        const timeBucket = item.bucket || item.timeBucket;
        const crowdLevel = item.level || item.crowdLevel;
        const normalizedDay = DAYS.includes(day) ? day : '';
        const normalizedBucket = TIME_BUCKETS.some((bucket) => bucket.key === timeBucket) ? timeBucket : '';
        const normalizedLevel = CROWD_LEVELS.includes(crowdLevel) ? crowdLevel : '';
        const locationProof = normalizeLocationProof(item.locationProof || report.locationProof);
        return {
          id:
            item.id ||
            (report.id && normalizedDay && normalizedBucket
              ? `crowd-${report.id}-${normalizedDay}-${normalizedBucket}`
              : createSubmissionId('crowd')),
          reportId: report.id,
          day: normalizedDay,
          timeBucket: normalizedBucket,
          crowdLevel: normalizedLevel,
          createdAt: item.createdAt || report.createdAt || new Date().toLocaleString(),
          votes: createAccuracyVotes(item.votes || report.crowdVotes || report.votes),
          ...(locationProof ? { locationProof } : {}),
        };
      })
      .filter((item) => item.day && item.timeBucket && item.crowdLevel);
  }
  if (
    DAYS.includes(report.crowdDay) &&
    TIME_BUCKETS.some((bucket) => bucket.key === report.crowdTimeBucket) &&
    CROWD_LEVELS.includes(report.crowdLevel)
  ) {
    return [
      {
        id: report.id ? `crowd-${report.id}-${report.crowdDay}-${report.crowdTimeBucket}` : createSubmissionId('crowd'),
        reportId: report.id,
        day: report.crowdDay,
        timeBucket: report.crowdTimeBucket,
        crowdLevel: report.crowdLevel,
        createdAt: report.createdAt || new Date().toLocaleString(),
        votes: createAccuracyVotes(report.crowdVotes || report.votes),
        ...(normalizeLocationProof(report.locationProof)
          ? { locationProof: normalizeLocationProof(report.locationProof) }
          : {}),
      },
    ];
  }
  return [];
}

export function getAccuracyStatus(venue) {
  const votes = createAccuracyVotes(venue.accuracyVotes);
  if (votes.down > votes.up) return 'disputed';
  if (votes.up > 0 && votes.up >= votes.down) return 'trusted';
  return 'unverified';
}

export function getAccuracyLabel(venue) {
  const status = getAccuracyStatus(venue);
  if (status === 'disputed') return 'Likely inaccurate';
  if (status === 'trusted') return 'Community verified';
  return 'Needs verification';
}

function hasReportValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function normalizeReportValue(value) {
  return String(value).trim().toLowerCase();
}

function getVoteScore(votes) {
  const normalized = createAccuracyVotes(votes);
  return Math.max(0, 1 + normalized.up - normalized.down);
}

export function getFieldSubmissions(venue, fieldKey) {
  const stored = (venue.fieldSubmissions || []).filter(
    (submission) => submission.fieldKey === fieldKey && hasReportValue(submission.value),
  );
  if (stored.length) return stored;
  return [
    ...createFieldSubmissionsFromVenue(venue),
    ...(venue.reports || []).flatMap((report) => createFieldSubmissionsFromReport(report, venue.id)),
  ].filter((submission) => submission.fieldKey === fieldKey);
}

export function getFieldConsensus(venue, fieldKey) {
  const field = CONFIDENCE_FIELDS.find((item) => item.key === fieldKey);
  const submissions = getFieldSubmissions(venue, fieldKey);
  const groups = new Map();

  submissions.forEach((submission, index) => {
    const value = clampFieldValue(fieldKey, submission.value);
    if (!value) return;
    const key = normalizeReportValue(value);
    const existing = groups.get(key) || {
      value,
      score: 0,
      rawCount: 0,
      newestIndex: -1,
      votes: { up: 0, down: 0 },
    };
    const votes = createAccuracyVotes(submission.votes);
    existing.score += getVoteScore(votes);
    existing.rawCount += 1;
    existing.newestIndex = Math.max(existing.newestIndex, index);
    existing.votes.up += votes.up;
    existing.votes.down += votes.down;
    groups.set(key, existing);
  });

  const ranked = [...groups.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.rawCount !== a.rawCount) return b.rawCount - a.rawCount;
    return b.newestIndex - a.newestIndex;
  });
  const totalScore = ranked.reduce((sum, group) => sum + group.score, 0);
  const winner = ranked[0];
  const fallbackValue = hasReportValue(venue[fieldKey]) ? normalizeFieldValue(venue[fieldKey]) : '';
  const value = winner?.value || fallbackValue || field?.fallback || 'Not reported';
  let confidence = 'unknown';
  if (winner) {
    const share = totalScore ? winner.score / totalScore : 0;
    if (winner.score >= 3 && share >= 0.6) confidence = 'high';
    else if (winner.score >= 2) confidence = 'medium';
    else if (winner.score >= 1) confidence = 'low';
  }

  return {
    key: fieldKey,
    label: field?.label || fieldKey,
    value,
    support: winner?.score || 0,
    supportScore: winner?.score || 0,
    totalScore,
    submissionCount: submissions.length,
    reportCount: submissions.length,
    confidence,
    level: confidence,
    votes: winner?.votes || { up: 0, down: 0 },
  };
}

export function getFieldConfidence(venue, fieldKey) {
  return getFieldConsensus(venue, fieldKey);
}

export function getBestImageSubmission(venue) {
  const images = [...(venue.imageSubmissions || [])];
  if (!images.length && venue.imageDataUrl) {
    images.push({
      id: 'legacy-venue-image',
      dataUrl: venue.imageDataUrl,
      name: venue.imageName || '',
      votes: createAccuracyVotes(),
    });
  }
  return images
    .filter((image) => image.dataUrl)
    .sort((a, b) => getVoteScore(b.votes) - getVoteScore(a.votes))[0] || null;
}

export function getCrowdHistogram(venue) {
  const cells = DAYS.flatMap((day) =>
    TIME_BUCKETS.map((bucket) => ({
      day,
      timeBucket: bucket.key,
      label: bucket.label,
      score: 0,
      support: 0,
      count: 0,
      crowdLevel: '',
    })),
  );
  const cellMap = new Map(cells.map((cell) => [`${cell.day}:${cell.timeBucket}`, cell]));

  (venue.reports || []).forEach((report) => {
    createCrowdReportsFromReport(report).forEach((item) => {
      const cell = cellMap.get(`${item.day}:${item.timeBucket}`);
      if (!cell) return;
      const support = getVoteScore(item.votes);
      if (!support) return;
      cell.score += (CROWD_LEVEL_SCORE[item.crowdLevel] || 0) * support;
      cell.support += support;
      cell.count += 1;
    });
  });

  cellMap.forEach((cell) => {
    if (!cell.support) return;
    const average = cell.score / cell.support;
    if (average >= 3.5) cell.crowdLevel = 'Packed';
    else if (average >= 2.5) cell.crowdLevel = 'Busy';
    else if (average >= 1.5) cell.crowdLevel = 'Steady';
    else cell.crowdLevel = 'Quiet';
  });

  return DAYS.map((day) => ({
    day,
    cells: TIME_BUCKETS.map((bucket) => cellMap.get(`${day}:${bucket.key}`)),
  }));
}

export function getDistanceMeters(origin, target) {
  if (!origin || !target) return Infinity;
  const lat1 = Number(origin.lat);
  const lng1 = Number(origin.lng);
  const lat2 = Number(target.lat);
  const lng2 = Number(target.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export function getDistanceLabel(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 160) return `${Math.round(meters)} m`;
  const miles = meters / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

export function getDayName(date = new Date()) {
  return DAYS[(date.getDay() + 6) % 7];
}

export function getTimeBucketKey(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 17 && hour < 20) return '5-8';
  if (hour >= 20 && hour < 23) return '8-11';
  if (hour >= 23 || hour < 5) return '11-close';
  return 'open-5';
}

export function getCurrentCrowdInsight(venue, date = new Date()) {
  const day = getDayName(date);
  const timeBucket = getTimeBucketKey(date);
  const bucket = TIME_BUCKETS.find((item) => item.key === timeBucket);
  const row = getCrowdHistogram(venue).find((item) => item.day === day);
  const cell = row?.cells.find((item) => item.timeBucket === timeBucket);
  const isWeekend = day === 'Friday' || day === 'Saturday' || day === 'Sunday';
  return {
    day,
    timeBucket,
    label: bucket?.label || timeBucket,
    isWeekend,
    crowdLevel: cell?.crowdLevel || '',
    reportCount: cell?.count || 0,
    support: cell?.support || 0,
  };
}

export function getVenueTips(venue) {
  const tips = [];
  if (hasReportValue(venue.bestTimes)) {
    tips.push({ label: 'Best times', value: String(venue.bestTimes).trim() });
  }
  (venue.reports || []).forEach((report) => {
    if (hasReportValue(report.bestTimes)) {
      tips.push({ label: 'Best times', value: String(report.bestTimes).trim() });
    }
    if (hasReportValue(report.tips)) {
      tips.push({ label: 'Tip', value: String(report.tips).trim() });
    }
  });

  const seen = new Set();
  return tips.filter((tip) => {
    const key = `${tip.label}:${tip.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  if (!normalizeLocationProof(report.locationProof)) return venue;
  const reports = [report, ...(venue.reports || [])];
  const fieldSubmissions = [
    ...createFieldSubmissionsFromReport(report, venue.id),
    ...(venue.fieldSubmissions || []),
  ];
  const imageSubmission = createImageSubmissionFromReport(report, venue.id);
  return {
    ...venue,
    name: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'name').value || venue.name,
    type: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'type').value || venue.type,
    address: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'address').value || venue.address,
    city: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'city').value || venue.city,
    state: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'state').value || venue.state,
    zip: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'zip').value || venue.zip,
    countryCode: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'countryCode').value || venue.countryCode,
    phoneType: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'phoneType').value || venue.phoneType,
    phone: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'phone').value || venue.phone,
    website: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'website').value || venue.website,
    mapsUrl: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'mapsUrl').value || venue.mapsUrl,
    tableCount: Number(getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'tableCount').value) || venue.tableCount,
    vibe: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'vibe').value || venue.vibe,
    tableRate: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'tableRate').value || venue.tableRate,
    drinkCost: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'drinkCost').value || venue.drinkCost,
    crowdLevel: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'crowdLevel').value || venue.crowdLevel,
    busyTimes: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'busyTimes').value || venue.busyTimes,
    bestTimes: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'bestTimes').value || venue.bestTimes,
    amenities: getFieldConsensus({ ...venue, reports, fieldSubmissions }, 'amenities').value || venue.amenities,
    reports,
    fieldSubmissions,
    imageSubmissions: imageSubmission
      ? [imageSubmission, ...(venue.imageSubmissions || [])]
      : venue.imageSubmissions || [],
  };
}
