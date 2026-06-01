const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export async function searchVenueByName({ name, city, state }) {
  const query = [name, city, state, 'billiards OR pool hall'].filter(Boolean).join(' ');
  if (!name?.trim()) return [];

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Venue lookup failed: ${response.status}`);
  }

  const results = await response.json();
  return Array.isArray(results) ? results.map(normalizeLookupResult) : [];
}

export function normalizeLookupResult(result) {
  const address = result.address || {};
  const street = [address.house_number, address.road].filter(Boolean).join(' ');
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    address.county ||
    '';

  return {
    id: `${result.osm_type || 'place'}-${result.osm_id || result.place_id}`,
    name: result.name || result.display_name?.split(',')[0] || '',
    address: street || result.display_name || '',
    city,
    state: normalizeState(address),
    zip: address.postcode || '',
    lat: Number(result.lat),
    lng: Number(result.lon),
    website: result.extratags?.website || result.extratags?.contact_website || '',
    phone: result.extratags?.phone || result.extratags?.contact_phone || '',
    displayName: result.display_name || result.name || 'OpenStreetMap result',
    source: 'OpenStreetMap',
  };
}

function normalizeState(address) {
  const iso = address['ISO3166-2-lvl4'];
  if (iso?.startsWith('US-')) return iso.slice(3);
  return STATE_CODES[address.state] || address.state || '';
}

const STATE_CODES = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};
