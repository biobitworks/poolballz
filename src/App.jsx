import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  Beer,
  CircleDot,
  Crosshair,
  Filter,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Star,
  ThumbsDown,
  ThumbsUp,
  Users,
  Wifi,
} from 'lucide-react';
import detailImage from '../assets/poolhall-detail.png';
import {
  AMENITIES,
  ACCESSIBILITY_OPTIONS,
  CONFIDENCE_FIELDS,
  COUNTRY_OPTIONS,
  CROWD_LEVELS,
  CURRENCY_OPTIONS,
  DAYS,
  PHONE_TYPES,
  TIME_BUCKETS,
  VENUE_TYPES,
  VIBES,
  applyCrowdSlotVote,
  applyReportVote,
  applyFieldVote,
  applyImageVote,
  applyVenueVote,
  createCrowdReportsFromReport,
  createOpenStreetMapUrl,
  createImageSubmissionFromReport,
  createReportId,
  createSubmissionId,
  createVenueId,
  formatAmenityLine,
  getAccuracyLabel,
  getAccuracyStatus,
  getAmenityList,
  getCurrentCrowdInsight,
  getDistanceLabel,
  getDistanceMeters,
  getFieldConfidence,
  getFieldConsensus,
  getFieldSubmissions,
  getBestImageSubmission,
  getCrowdHistogram,
  getVenueTips,
  mergeReportIntoVenue,
  normalizeLocationProof,
} from './venues.js';
import {
  loadRemoteVenues,
  loadVenues,
  loadVoteReceipts,
  saveRemoteVote,
  saveRemoteVenues,
  saveVenues,
  saveVoteReceipts,
} from './storage.js';
import { searchVenueByName } from './venueLookup.js';

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 };
const SMS_LIMIT = 160;
const FIELD_GROUP_LABELS = {
  identity: 'Identity',
  location: 'Location',
  contact: 'Contact',
  play: 'Play',
  cost: 'Cost',
  crowd: 'Crowd',
  venue: 'Venue',
  tips: 'Tips',
  access: 'Access',
  policy: 'Entry',
};
const ADDRESS_BOUND_FIELDS = new Set(['address', 'city', 'state', 'zip', 'countryCode']);

function venueVoteKey(venueId) {
  return `venue:${venueId}`;
}

function reportVoteKey(venueId, reportId) {
  return `report:${venueId}:${reportId}`;
}

function fieldVoteKey(venueId, reportId, fieldKey) {
  return `field:${venueId}:${reportId}:${fieldKey}`;
}

function imageVoteKey(venueId, imageId) {
  return `image:${venueId}:${imageId}`;
}

function crowdSlotVoteKey(venueId, reportId, slotId) {
  return `crowd:${venueId}:${reportId}:${slotId}`;
}

function getReceiptVote(receipts, key) {
  return receipts?.[key] === 'up' || receipts?.[key] === 'down' ? receipts[key] : null;
}

function updateReceiptVote(receipts, key, vote) {
  const currentVote = getReceiptVote(receipts, key);
  const next = { ...(receipts || {}) };
  if (currentVote === vote) {
    delete next[key];
  } else {
    next[key] = vote;
  }
  return next;
}

function hasAddressBounds(venueOrPin) {
  return Boolean(venueOrPin?.boundingBox);
}

function currencyForCountry(countryCode) {
  return COUNTRY_OPTIONS.find((country) => country.code === countryCode)?.currency || 'USD';
}

function notReportedOption(label = 'Not reported') {
  return <option value="">{label}</option>;
}

function isInsideBoundingBox(location, boundingBox) {
  if (!location || !boundingBox) return false;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= Number(boundingBox.south) &&
    lat <= Number(boundingBox.north) &&
    lng >= Number(boundingBox.west) &&
    lng <= Number(boundingBox.east)
  );
}

function canContributeAtLocation(location, venueOrPin) {
  if (!location || !venueOrPin) return false;
  if (!hasAddressBounds(venueOrPin)) return false;
  return isInsideBoundingBox(location, venueOrPin.boundingBox);
}

function createLocationProof(location, venueOrPin) {
  if (!canContributeAtLocation(location, venueOrPin)) return null;
  return normalizeLocationProof({
    addressVerified: true,
    verifiedAt: new Date().toISOString(),
    method: 'address-bounds',
    distanceMeters: getDistanceMeters(location, venueOrPin),
  });
}

function createAccuracyVoteWithProof(votes = {}, locationProof) {
  const normalizedProof = normalizeLocationProof(locationProof);
  return {
    up: Math.max(0, Number(votes.up) || 0),
    down: Math.max(0, Number(votes.down) || 0),
    ...(normalizedProof ? { locationProof: normalizedProof } : {}),
  };
}

function contributionGateMessage(canContribute, venueOrPin) {
  if (canContribute) return '';
  if (!hasAddressBounds(venueOrPin)) {
    return 'Select a mapped address result before adding reports or voting.';
  }
  return 'Use My Location while you are inside this venue address to add reports or vote.';
}

function normalizeWebsiteUrl(website) {
  const value = String(website || '').trim();
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function phoneHref(phone) {
  const normalized = String(phone || '').replace(/[^\d+]/g, '');
  return normalized ? `tel:${normalized}` : '';
}

function formatVenueAddress(venue) {
  return [
    venue.address,
    venue.city,
    venue.state,
    venue.zip,
    venue.countryCode && venue.countryCode !== 'US' ? venue.countryCode : '',
  ]
    .filter(Boolean)
    .join(', ');
}

function formatCrowdSlot(slot) {
  const bucket = TIME_BUCKETS.find((item) => item.key === slot.timeBucket);
  return `${slot.day} ${bucket?.label || slot.timeBucket}: ${slot.crowdLevel}`;
}

function createCrowdSlotSubmission(slot) {
  return {
    id: createSubmissionId('crowd'),
    day: slot.day,
    timeBucket: slot.timeBucket,
    crowdLevel: slot.crowdLevel,
    votes: {
      up: 0,
      down: 0,
      ...(slot.locationProof ? { locationProof: slot.locationProof } : {}),
    },
    ...(slot.locationProof ? { locationProof: slot.locationProof } : {}),
  };
}

function composeAmenityLine(selectedAmenities, freeformAmenities = '') {
  return formatAmenityLine([...selectedAmenities, freeformAmenities]);
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve({ imageDataUrl: '', imageName: '' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ imageDataUrl: String(reader.result || ''), imageName: file.name });
    reader.onerror = () => reject(new Error('Unable to read image.'));
    reader.readAsDataURL(file);
  });
}

const defaultForm = {
  name: '',
  type: 'Pool Hall',
  address: '',
  city: '',
  state: '',
  zip: '',
  countryCode: 'US',
  phone: '',
  phoneType: 'Main',
  website: '',
  tableCount: '',
  vibe: '',
  tableRate: '',
  currencyCode: 'USD',
  drinkCost: '',
  crowdLevel: '',
  crowdDay: '',
  crowdTimeBucket: '',
  crowdSlots: [],
  busyTimes: '',
  bestTimes: '',
  tips: '',
  hours: '',
  accessibility: '',
  stepFreeEntrance: '',
  accessibleRestroom: '',
  accessibleParking: '',
  stairs: '',
  elevator: '',
  idRequirement: '',
  ageRange: '',
  description: '',
  amenities: [],
  amenitiesText: '',
  lat: AUSTIN_CENTER.lat,
  lng: AUSTIN_CENTER.lng,
  boundingBox: null,
};

function Header({ city, onUseLocation, locationStatus }) {
  return (
    <header className="app-header">
      <div className="brand" aria-label="Poolballz home">
        <span className="brand-mark">8</span>
        <span>Poolballz</span>
      </div>
      <nav className="top-nav" aria-label="Primary navigation">
        <a href="#directory" className="active">
          Directory
        </a>
        <a href="#map">Map</a>
        <a href="#add">Add Venue</a>
      </nav>
      <div className="header-actions">
        <span className="city-chip">
          <MapPin size={15} aria-hidden="true" />
          {city || 'Choose city'}
        </span>
        <button className="location-button" type="button" onClick={onUseLocation}>
          <Navigation size={16} aria-hidden="true" />
          Use My Location
        </button>
      </div>
      <span className="sr-only" role="status">
        {locationStatus}
      </span>
    </header>
  );
}

function Directory({ venues, selectedId, onSelect, filters, setFilters, userLocation, currentTime }) {
  const filteredVenues = useMemo(
    () => filterVenues(venues, filters, userLocation),
    [venues, filters, userLocation],
  );

  return (
    <section className="directory-panel" id="directory" aria-labelledby="directory-heading">
      <div className="search-row">
        <label className="search-box">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Search by name, city, or keyword</span>
          <input
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Search by name, city, or keyword"
          />
        </label>
        <button className="icon-button" type="button" aria-label="Filter venues">
          <Filter size={18} />
        </button>
      </div>

      <div className="filter-grid" aria-label="Venue filters">
        <label>
          <span>City</span>
          <input
            value={filters.city}
            onChange={(event) => setFilters({ ...filters, city: event.target.value })}
            placeholder="Austin"
          />
        </label>
        <label>
          <span>Type</span>
          <select
            value={filters.type}
            onChange={(event) => setFilters({ ...filters, type: event.target.value })}
          >
            <option>All</option>
            {VENUE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Crowd</span>
          <select
            value={filters.crowdLevel}
            onChange={(event) => setFilters({ ...filters, crowdLevel: event.target.value })}
          >
            <option>All</option>
            {CROWD_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="list-meta">
        <h1 id="directory-heading">{filteredVenues.length} venues found</h1>
        <span>{userLocation ? 'Nearest trusted venues first' : 'Community reports, newest first'}</span>
      </div>

      <div className="venue-list">
        {filteredVenues.map((venue) => {
          const accuracyStatus = getAccuracyStatus(venue);
          const accuracyLabel = getAccuracyLabel(venue);
          const venueName = getFieldConsensus(venue, 'name').value;
          const venueType = getFieldConsensus(venue, 'type').value;
          const city = getFieldConsensus(venue, 'city').value;
          const state = getFieldConsensus(venue, 'state').value;
          const tableCount = getFieldConsensus(venue, 'tableCount').value;
          const tableRate = getFieldConsensus(venue, 'tableRate').value;
          const drinkCost = getFieldConsensus(venue, 'drinkCost').value;
          const crowdLevel = getFieldConsensus(venue, 'crowdLevel').value;
          const busyTimes = getFieldConsensus(venue, 'busyTimes').value;
          const vibe = getFieldConsensus(venue, 'vibe').value;
          const amenities = getAmenityList(getFieldConsensus(venue, 'amenities').value || venue.amenities);
          const distanceLabel = getDistanceLabel(getDistanceMeters(userLocation, venue));
          const nowInsight = getCurrentCrowdInsight(venue, currentTime);
          return (
          <button
            className={`venue-row ${venue.id === selectedId ? 'selected' : ''} ${accuracyStatus}`}
            key={venue.id}
            type="button"
            onClick={() => onSelect(venue.id)}
          >
            <span className={`status-dot ${venue.openNow ? 'open' : 'closed'}`} />
            <span className="venue-summary">
              <strong>{venueName}</strong>
              <span>
                {city}, {state} · {venueType} · {tableCount || '?'} tables
              </span>
              <span>
                {[tableRate, drinkCost, crowdLevel]
                  .filter(Boolean)
                  .join(' · ') || 'No community reports yet'}
              </span>
              <span className="tag-row">
                <em className={`accuracy-badge ${accuracyStatus}`}>{accuracyLabel}</em>
                {nowInsight.crowdLevel && (
                  <em className="now-badge">Now: {nowInsight.crowdLevel}</em>
                )}
                {[vibe, ...amenities.slice(0, 2)]
                  .filter(Boolean)
                  .map((tag) => (
                    <em key={tag}>{tag}</em>
                  ))}
              </span>
            </span>
            <span className="row-side">
              <b>{venue.reports?.length || 0} reports</b>
              {distanceLabel && <b>{distanceLabel}</b>}
              <b className="vote-score">
                {(venue.accuracyVotes?.up || 0) - (venue.accuracyVotes?.down || 0)} trust
              </b>
              <span>{busyTimes}</span>
            </span>
          </button>
          );
        })}
      </div>
    </section>
  );
}

function OpenMap({ venues, selectedId, onSelect, draftPin, onPinChange, onResultSelect }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');

  async function handleMapSearch(event) {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchStatus('Enter a venue name to search the map.');
      return;
    }
    setSearchStatus('Searching OpenStreetMap...');
    setSearchResults([]);
    try {
      const results = await searchVenueByName({ name: searchQuery });
      setSearchResults(results);
      setSearchStatus(
        results.length
          ? `${results.length} match${results.length > 1 ? 'es' : ''} found - pick one to drop a pin.`
          : 'No matches found on the map.',
      );
    } catch {
      setSearchStatus('Map search is unavailable right now.');
    }
  }

  function pickResult(result) {
    const lat = Number(result.lat);
    const lng = Number(result.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      mapRef.current?.setView([lat, lng], 16);
      onResultSelect(result);
      setSearchStatus(`${result.name || 'Venue'} centered on the map.`);
    } else {
      setSearchStatus('That result has no map location.');
    }
    setSearchResults([]);
  }

  useEffect(() => {
    let disposed = false;
    let map;

    async function initMap() {
      const L = await import('leaflet');
      if (disposed || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [draftPin.lat, draftPin.lng],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      map.on('click', (event) => {
        onPinChange({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
      mapRef.current = map;
    }

    initMap();

    return () => {
      disposed = true;
      if (map) map.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function drawMarkers() {
      const L = await import('leaflet');
      if (cancelled || !mapRef.current || !layerRef.current) return;
      layerRef.current.clearLayers();

      venues
        .filter((venue) => Number.isFinite(venue.lat) && Number.isFinite(venue.lng))
        .forEach((venue) => {
          const selected = venue.id === selectedId;
          const disputed = getAccuracyStatus(venue) === 'disputed';
          L.circleMarker([venue.lat, venue.lng], {
            radius: selected ? 10 : 7,
            color: selected ? '#f5af19' : disputed ? '#a33f2f' : '#166534',
            fillColor: selected ? '#f5af19' : disputed ? '#d8614d' : '#35b46f',
            fillOpacity: 0.95,
            weight: 2,
          })
            .addTo(layerRef.current)
            .bindTooltip(`${venue.name} · ${getFieldConsensus(venue, 'tableCount').value || '?'} tables · ${getAccuracyLabel(venue)}`)
            .on('click', () => onSelect(venue.id));
        });

      L.circleMarker([draftPin.lat, draftPin.lng], {
        radius: 8,
        color: '#0f172a',
        fillColor: '#ffffff',
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(layerRef.current)
        .bindTooltip('New venue pin');
    }

    drawMarkers();
    mapRef.current?.setView([draftPin.lat, draftPin.lng], mapRef.current.getZoom());
    return () => {
      cancelled = true;
    };
  }, [venues, selectedId, draftPin, onSelect]);

  return (
    <section className="map-panel" id="map" aria-labelledby="map-heading">
      <div className="panel-title">
        <h2 id="map-heading">Open Map Pins</h2>
        <span>OpenStreetMap</span>
      </div>
      <form className="map-search" role="search" onSubmit={handleMapSearch}>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search the map by venue name</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search the map by name (e.g. Stork Club)"
          />
        </label>
        <button className="secondary-button" type="submit">
          Search Map
        </button>
      </form>
      {searchStatus && (
        <p className="lookup-status" role="status">
          {searchStatus}
        </p>
      )}
      {searchResults.length > 0 && (
        <div className="lookup-results" aria-label="Map search results">
          {searchResults.map((result) => (
            <button key={result.id} type="button" onClick={() => pickResult(result)}>
              <strong>{result.name || 'Unnamed venue'}</strong>
              <span>{result.displayName}</span>
            </button>
          ))}
        </div>
      )}
      <div className="map-canvas" ref={containerRef} aria-label="OpenStreetMap venue map" />
      <div className="pin-readout">
        <Crosshair size={16} aria-hidden="true" />
        New pin: {draftPin.lat.toFixed(4)}, {draftPin.lng.toFixed(4)}
      </div>
    </section>
  );
}

function AddVenueForm({ onAdd, draftPin, onPinChange, seed, userLocation }) {
  const [form, setForm] = useState(defaultForm);
  const [image, setImage] = useState({ imageDataUrl: '', imageName: '' });
  const [message, setMessage] = useState('');
  const [lookupStatus, setLookupStatus] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const canContribute = canContributeAtLocation(userLocation, form);

  useEffect(() => {
    setForm((current) => ({ ...current, lat: draftPin.lat, lng: draftPin.lng }));
  }, [draftPin]);

  // Prefill the form when a map search result is picked elsewhere on the page.
  useEffect(() => {
    if (!seed) return;
    const lat = Number(seed.lat);
    const lng = Number(seed.lng);
    setForm((current) => ({
      ...current,
      name: seed.name || current.name,
      address: seed.address || current.address,
      city: seed.city || current.city,
      state: seed.state || current.state,
      zip: seed.zip || current.zip,
      countryCode: seed.countryCode || current.countryCode,
      currencyCode: seed.currencyCode || current.currencyCode || currencyForCountry(seed.countryCode || current.countryCode),
      phone: seed.phone || current.phone,
      website: seed.website || current.website,
      lat: Number.isFinite(lat) ? lat : current.lat,
      lng: Number.isFinite(lng) ? lng : current.lng,
      boundingBox: seed.boundingBox || current.boundingBox,
    }));
    setLookupStatus(`${seed.name || 'Venue'} loaded from map search - review and add it.`);
    setLookupResults([]);
  }, [seed]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'countryCode' ? { currencyCode: currencyForCountry(value) } : {}),
      ...(ADDRESS_BOUND_FIELDS.has(field) && value !== current[field] ? { boundingBox: null } : {}),
    }));
    if (field === 'lat' || field === 'lng') {
      const next = {
        lat: field === 'lat' ? Number(value) : Number(form.lat),
        lng: field === 'lng' ? Number(value) : Number(form.lng),
      };
      if (Number.isFinite(next.lat) && Number.isFinite(next.lng)) onPinChange(next);
    }
  }

  async function handleLookup() {
    if (!form.name.trim()) {
      setLookupStatus('Enter a venue name first.');
      return;
    }

    setLookupStatus('Searching OpenStreetMap...');
    setLookupResults([]);
    try {
      const results = await searchVenueByName({
        name: form.name,
        city: form.city,
        state: form.state,
      });
      setLookupResults(results);
      setLookupStatus(results.length ? `${results.length} possible matches found.` : 'No matches found.');
    } catch {
      setLookupStatus('Venue lookup is unavailable right now.');
    }
  }

  function applyLookupResult(result) {
    const nextLat = Number(result.lat);
    const nextLng = Number(result.lng);
    setForm((current) => ({
      ...current,
      name: result.name || current.name,
      address: result.address || current.address,
      city: result.city || current.city,
      state: result.state || current.state,
      zip: result.zip || current.zip,
      countryCode: result.countryCode || current.countryCode,
      currencyCode: result.currencyCode || current.currencyCode || currencyForCountry(result.countryCode || current.countryCode),
      phone: result.phone || current.phone,
      website: result.website || current.website,
      lat: Number.isFinite(nextLat) ? nextLat : current.lat,
      lng: Number.isFinite(nextLng) ? nextLng : current.lng,
      boundingBox: result.boundingBox || current.boundingBox,
    }));
    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
      onPinChange({ lat: nextLat, lng: nextLng });
    }
    setLookupStatus(`${result.name || 'Venue'} populated from OpenStreetMap.`);
    setLookupResults([]);
  }

  function toggleAmenity(amenity) {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }));
  }

  function addCrowdWindow() {
    if (!form.crowdDay || !form.crowdTimeBucket || !form.crowdLevel) {
      setMessage('Pick crowd day, time, and level before adding a crowd window.');
      return;
    }
    const nextSlot = {
      day: form.crowdDay,
      timeBucket: form.crowdTimeBucket,
      crowdLevel: form.crowdLevel,
    };
    setForm((current) => ({
      ...current,
      crowdDay: '',
      crowdTimeBucket: '',
      crowdLevel: '',
      crowdSlots: [...current.crowdSlots, nextSlot],
    }));
    setMessage('');
  }

  function removeCrowdWindow(index) {
    setForm((current) => ({
      ...current,
      crowdSlots: current.crowdSlots.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleImageChange(file) {
    if (!file) {
      setImage({ imageDataUrl: '', imageName: '' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMessage('Choose an image file.');
      return;
    }
    setImage(await readImageAsDataUrl(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim() || !form.address.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage('Add a venue name, address, and map pin.');
      return;
    }
    if (!canContribute) {
      setMessage('Use My Location at the venue address before adding it.');
      return;
    }

    const venueId = createVenueId(form.name);
    const pendingCrowdSlot =
      form.crowdDay && form.crowdTimeBucket && form.crowdLevel
        ? [{ day: form.crowdDay, timeBucket: form.crowdTimeBucket, crowdLevel: form.crowdLevel }]
        : [];
    const locationProof = createLocationProof(userLocation, form);
    if (!locationProof) {
      setMessage('Use My Location inside the mapped address bounds before adding it.');
      return;
    }
    const crowdSlots = [...form.crowdSlots, ...pendingCrowdSlot].map((slot) =>
      createCrowdSlotSubmission({ ...slot, locationProof }),
    );
    const amenitiesLine = composeAmenityLine(form.amenities, form.amenitiesText);
    const tableCount = form.tableCount.trim() ? Number(form.tableCount) : null;
    const normalizedState = form.countryCode === 'US' ? form.state.trim().toUpperCase() : form.state.trim();
    const mapsUrl = createOpenStreetMapUrl(lat, lng);
    const report = {
      id: createReportId(),
      reporter: 'Anonymous community report',
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim(),
      city: form.city.trim(),
      state: normalizedState,
      zip: form.zip.trim(),
      countryCode: form.countryCode,
      phoneType: form.phoneType,
      phone: form.phone,
      website: form.website,
      mapsUrl,
      tableCount: form.tableCount,
      vibe: form.vibe,
      tableRate: form.tableRate,
      currencyCode: form.currencyCode,
      drinkCost: form.drinkCost,
      crowdLevel: form.crowdLevel,
      crowdDay: form.crowdDay,
      crowdTimeBucket: form.crowdTimeBucket,
      crowdSlots,
      busyTimes: form.busyTimes,
      bestTimes: form.bestTimes,
      tips: form.tips,
      hours: form.hours,
      description: form.description,
      accessibility: form.accessibility,
      stepFreeEntrance: form.stepFreeEntrance,
      accessibleRestroom: form.accessibleRestroom,
      accessibleParking: form.accessibleParking,
      stairs: form.stairs,
      elevator: form.elevator,
      idRequirement: form.idRequirement,
      ageRange: form.ageRange,
      imageDataUrl: image.imageDataUrl,
      imageName: image.imageName,
      votes: { up: 0, down: 0, locationProof },
      amenities: amenitiesLine,
      createdAt: new Date().toLocaleString(),
      locationProof,
    };

    const venue = {
      ...form,
      id: venueId,
      source: 'community',
      name: form.name.trim(),
      address: form.address.trim() || 'Dropped pin',
      city: form.city.trim(),
      state: normalizedState,
      zip: form.zip.trim(),
      countryCode: form.countryCode,
      phoneType: form.phoneType,
      currencyCode: form.currencyCode,
      tableCount,
      lat,
      lng,
      boundingBox: form.boundingBox,
      distance: 0,
      price: '$$',
      openNow: true,
      mapsUrl,
      description: form.description.trim(),
      amenities: amenitiesLine,
      reports: [report],
      imageSubmissions: createImageSubmissionFromReport(report, venueId)
        ? [createImageSubmissionFromReport(report, venueId)]
        : [],
      imageDataUrl: image.imageDataUrl,
      imageName: image.imageName,
      accuracyVotes: { up: 0, down: 0, locationProof },
      locationProof,
    };

    onAdd(venue);
    setForm({ ...defaultForm, lat: draftPin.lat, lng: draftPin.lng });
    setImage({ imageDataUrl: '', imageName: '' });
    setMessage(`${venue.name} added with a community report.`);
  }

  return (
    <section className="add-panel" id="add" aria-labelledby="add-heading">
      <div className="panel-title">
        <h2 id="add-heading">Add New Venue</h2>
        <span>User-entered data</span>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="lookup-block">
          <label>
            Venue Name
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Breaktime Billiards"
              autoComplete="organization"
            />
          </label>
          <button className="secondary-button lookup-button" type="button" onClick={handleLookup}>
            <Search size={16} aria-hidden="true" />
            Find Venue
          </button>
          <p className="lookup-status" role="status">
            {lookupStatus}
          </p>
          {lookupResults.length > 0 && (
            <div className="lookup-results" aria-label="Venue lookup results">
              {lookupResults.map((result) => (
                <button key={result.id} type="button" onClick={() => applyLookupResult(result)}>
                  <strong>{result.name || 'Unnamed venue'}</strong>
                  <span>{result.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <label>
          Venue Type
          <select value={form.type} onChange={(event) => updateField('type', event.target.value)}>
            {VENUE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Address
          <input
            value={form.address}
            onChange={(event) => updateField('address', event.target.value)}
            placeholder="Street address"
            autoComplete="street-address"
          />
        </label>
        <div className="form-grid">
          <label>
            Country
            <select
              value={form.countryCode}
              onChange={(event) => updateField('countryCode', event.target.value)}
              autoComplete="country"
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <input
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder="Austin"
              autoComplete="address-level2"
            />
          </label>
          <label>
            {form.countryCode === 'US' ? 'State' : 'Region'}
            <input
              value={form.state}
              onChange={(event) => updateField('state', event.target.value)}
              autoComplete="address-level1"
            />
          </label>
          <label>
            {form.countryCode === 'US' ? 'ZIP' : 'Postal Code'}
            <input
              value={form.zip}
              onChange={(event) => updateField('zip', event.target.value)}
              autoComplete="postal-code"
            />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Phone Type
            <select value={form.phoneType} onChange={(event) => updateField('phoneType', event.target.value)}>
              {PHONE_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Phone
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="(503) 555-0101"
              autoComplete="tel"
            />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Website
            <input
              type="url"
              inputMode="url"
              value={form.website}
              onChange={(event) => updateField('website', event.target.value)}
              placeholder="https://example.com"
              autoComplete="url"
            />
          </label>
          <label>
            Currency
            <select value={form.currencyCode} onChange={(event) => updateField('currencyCode', event.target.value)}>
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Latitude
            <input
              value={form.lat}
              onChange={(event) => updateField('lat', event.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            Longitude
            <input
              value={form.lng}
              onChange={(event) => updateField('lng', event.target.value)}
              inputMode="decimal"
            />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Tables
            <input
              value={form.tableCount}
              onChange={(event) => updateField('tableCount', event.target.value)}
              inputMode="numeric"
              placeholder="8"
            />
          </label>
          <label>
            Vibe
            <select value={form.vibe} onChange={(event) => updateField('vibe', event.target.value)}>
              {notReportedOption()}
              {VIBES.map((vibe) => (
                <option key={vibe}>{vibe}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Table Cost
            <input
            value={form.tableRate}
            onChange={(event) => updateField('tableRate', event.target.value)}
            maxLength={SMS_LIMIT}
            placeholder="12/hr, 2/game, or free with drink"
          />
          </label>
          <label>
            Drinks
            <input
            value={form.drinkCost}
            onChange={(event) => updateField('drinkCost', event.target.value)}
            maxLength={SMS_LIMIT}
            placeholder="6 beer, 8 cocktails, BYOB"
          />
          </label>
        </div>
        <label>
          Crowd Level
          <select
          value={form.crowdLevel}
          onChange={(event) => updateField('crowdLevel', event.target.value)}
        >
            {notReportedOption()}
            {CROWD_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <div className="form-grid two">
          <label>
            Crowd Day
            <select value={form.crowdDay} onChange={(event) => updateField('crowdDay', event.target.value)}>
              {notReportedOption('No day')}
              {DAYS.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </label>
          <label>
            Crowd Time
            <select
              value={form.crowdTimeBucket}
              onChange={(event) => updateField('crowdTimeBucket', event.target.value)}
            >
              {notReportedOption('No time')}
              {TIME_BUCKETS.map((bucket) => (
                <option key={bucket.key} value={bucket.key}>
                  {bucket.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="crowd-window-actions">
          <button className="secondary-button compact" type="button" onClick={addCrowdWindow}>
            Add Crowd Window
          </button>
        </div>
        {form.crowdSlots.length > 0 && (
          <div className="crowd-slot-list" aria-label="Added crowd windows">
            {form.crowdSlots.map((slot, index) => (
              <span key={`${slot.day}-${slot.timeBucket}-${slot.crowdLevel}-${index}`}>
                {formatCrowdSlot(slot)}
                <button type="button" onClick={() => removeCrowdWindow(index)} aria-label={`Remove ${formatCrowdSlot(slot)}`}>
                  Remove
                </button>
              </span>
            ))}
          </div>
        )}
        <label>
          Crowded When
          <input
            value={form.busyTimes}
            onChange={(event) => updateField('busyTimes', event.target.value)}
            maxLength={SMS_LIMIT}
            placeholder="Friday after 8 PM"
          />
        </label>
        <label>
          Best Times To Go
          <input
            value={form.bestTimes}
            onChange={(event) => updateField('bestTimes', event.target.value)}
            maxLength={SMS_LIMIT}
            placeholder="Weekday afternoons"
          />
        </label>
        <label>
          Hours
          <input
            value={form.hours}
            maxLength={SMS_LIMIT}
            onChange={(event) => updateField('hours', event.target.value)}
            placeholder="11:00 AM - 2:00 AM"
          />
        </label>
        <label>
          Tips & Tricks
          <input
            value={form.tips}
            maxLength={SMS_LIMIT}
            onChange={(event) => updateField('tips', event.target.value)}
            placeholder="Table condition, league nights, parking, cash-only tables..."
          />
        </label>
        <div className="form-grid two">
          <label>
            Step-Free Entrance
            <select
              value={form.stepFreeEntrance}
              onChange={(event) => updateField('stepFreeEntrance', event.target.value)}
            >
              {notReportedOption()}
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Accessible Restroom
            <select
              value={form.accessibleRestroom}
              onChange={(event) => updateField('accessibleRestroom', event.target.value)}
            >
              {notReportedOption()}
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Accessible Parking
            <select
              value={form.accessibleParking}
              onChange={(event) => updateField('accessibleParking', event.target.value)}
            >
              {notReportedOption()}
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Stairs
            <select value={form.stairs} onChange={(event) => updateField('stairs', event.target.value)}>
              {notReportedOption()}
              <option>Unknown</option>
              <option>No stairs</option>
              <option>Some stairs</option>
              <option>Stairs required</option>
            </select>
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Elevator
            <select value={form.elevator} onChange={(event) => updateField('elevator', event.target.value)}>
              {notReportedOption()}
              <option>Unknown</option>
              <option>Available</option>
              <option>Not available</option>
              <option>Not needed</option>
            </select>
          </label>
        </div>
        <label>
          Accessibility Notes
          <input
            value={form.accessibility}
            maxLength="160"
            onChange={(event) => updateField('accessibility', event.target.value)}
            placeholder="Step-free entrance, accessible restroom, wide paths..."
          />
        </label>
        <div className="form-grid two">
          <label>
            ID
            <input
            value={form.idRequirement}
              maxLength={SMS_LIMIT}
              onChange={(event) => updateField('idRequirement', event.target.value)}
              placeholder="21+ ID checked after 9 PM"
            />
          </label>
          <label>
            Age Range
            <input
            value={form.ageRange}
              maxLength={SMS_LIMIT}
              onChange={(event) => updateField('ageRange', event.target.value)}
              placeholder="All ages before 8 PM"
            />
          </label>
        </div>
        <label>
          Optional Image
          <input type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0])} />
        </label>
        {image.imageName && <p className="form-message">Image attached: {image.imageName}</p>}
        <label>
          Short Description
          <input
            value={form.description}
            maxLength={SMS_LIMIT}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Brief description of the venue..."
          />
        </label>
        <fieldset>
          <legend>Amenities</legend>
          <div className="amenity-grid">
            {AMENITIES.map((amenity) => (
              <label key={amenity} className="check-row">
                <input
                  type="checkbox"
                  checked={form.amenities.includes(amenity)}
                  onChange={() => toggleAmenity(amenity)}
                />
                {amenity}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Amenity Notes
          <input
            value={form.amenitiesText}
            maxLength={SMS_LIMIT}
            onChange={(event) => updateField('amenitiesText', event.target.value)}
            placeholder="Darts, jukebox, patio, lockers..."
          />
        </label>
        {!canContribute && <p className="form-message">{contributionGateMessage(canContribute, form)}</p>}
        <button className="submit-button" type="submit" disabled={!canContribute}>
          <Plus size={18} aria-hidden="true" />
          Add Venue
        </button>
        <p className="form-message" role="status">
          {message}
        </p>
      </form>
    </section>
  );
}

function ReportForm({ venue, onReport, canContribute }) {
  const [report, setReport] = useState({
    name: '',
    type: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    countryCode: '',
    phoneType: '',
    phone: '',
    website: '',
    tableCount: '',
    vibe: '',
    tableRate: '',
    currencyCode: venue?.currencyCode || 'USD',
    drinkCost: '',
    crowdLevel: '',
    crowdDay: '',
    crowdTimeBucket: '',
    crowdSlots: [],
    busyTimes: '',
    bestTimes: '',
    hours: '',
    accessibility: '',
    stepFreeEntrance: '',
    accessibleRestroom: '',
    accessibleParking: '',
    stairs: '',
    elevator: '',
    idRequirement: '',
    ageRange: '',
    description: '',
    tips: '',
    amenities: [],
    amenitiesText: '',
  });
  const [image, setImage] = useState({ imageDataUrl: '', imageName: '' });

  useEffect(() => {
    setReport({
      name: '',
      type: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      countryCode: '',
      phoneType: '',
      phone: '',
      website: '',
      tableCount: '',
      vibe: '',
      tableRate: '',
      currencyCode: venue?.currencyCode || 'USD',
      drinkCost: '',
      crowdLevel: '',
      crowdDay: '',
      crowdTimeBucket: '',
      crowdSlots: [],
      busyTimes: '',
      bestTimes: '',
      hours: '',
      accessibility: '',
      stepFreeEntrance: '',
      accessibleRestroom: '',
      accessibleParking: '',
      stairs: '',
      elevator: '',
      idRequirement: '',
      ageRange: '',
      description: '',
      tips: '',
      amenities: [],
      amenitiesText: '',
    });
    setImage({ imageDataUrl: '', imageName: '' });
  }, [venue?.id]);

  function update(field, value) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function toggleReportAmenity(amenity) {
    setReport((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }));
  }

  function addReportCrowdWindow() {
    if (!report.crowdDay || !report.crowdTimeBucket || !report.crowdLevel) return;
    const nextSlot = {
      day: report.crowdDay,
      timeBucket: report.crowdTimeBucket,
      crowdLevel: report.crowdLevel,
    };
    setReport((current) => ({
      ...current,
      crowdDay: '',
      crowdTimeBucket: '',
      crowdLevel: '',
      crowdSlots: [...current.crowdSlots, nextSlot],
    }));
  }

  function removeReportCrowdWindow(index) {
    setReport((current) => ({
      ...current,
      crowdSlots: current.crowdSlots.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleImageChange(file) {
    if (!file) {
      setImage({ imageDataUrl: '', imageName: '' });
      return;
    }
    if (!file.type.startsWith('image/')) return;
    setImage(await readImageAsDataUrl(file));
  }

  function submit(event) {
    event.preventDefault();
    if (!canContribute) return;
    const pendingCrowdSlot =
      report.crowdDay && report.crowdTimeBucket && report.crowdLevel
        ? [{ day: report.crowdDay, timeBucket: report.crowdTimeBucket, crowdLevel: report.crowdLevel }]
        : [];
    const crowdSlots = [...report.crowdSlots, ...pendingCrowdSlot].map(createCrowdSlotSubmission);
    const amenitiesLine = composeAmenityLine(report.amenities, report.amenitiesText);
    onReport(venue.id, {
      id: createReportId(),
      reporter: 'Anonymous community report',
      ...report,
      mapsUrl: report.address || report.city || report.state || report.zip ? venue.mapsUrl : '',
      tableCount: report.tableCount === '' ? '' : Number(report.tableCount),
      crowdSlots,
      imageDataUrl: image.imageDataUrl,
      imageName: image.imageName,
      votes: { up: 0, down: 0 },
      amenities: amenitiesLine,
      createdAt: new Date().toLocaleString(),
    });
    setImage({ imageDataUrl: '', imageName: '' });
  }

  return (
    <form className="report-form" onSubmit={submit} aria-label="Update venue report">
      <h3>Update Local Intel</h3>
      {!canContribute && <p className="form-message">{contributionGateMessage(canContribute, venue)}</p>}
      <div className="form-grid two">
        <label>
          Venue Name
          <input
            value={report.name}
            maxLength={SMS_LIMIT}
            onChange={(event) => update('name', event.target.value)}
            placeholder={venue.name}
            autoComplete="organization"
          />
        </label>
        <label>
          Venue Type
          <select value={report.type} onChange={(event) => update('type', event.target.value)}>
            {notReportedOption()}
            {VENUE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Address
        <input
          value={report.address}
          maxLength={SMS_LIMIT}
          onChange={(event) => update('address', event.target.value)}
          placeholder={venue.address}
          autoComplete="street-address"
        />
      </label>
      <div className="form-grid two">
        <label>
          Country
          <select value={report.countryCode} onChange={(event) => update('countryCode', event.target.value)}>
            {notReportedOption()}
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          City
          <input
            value={report.city}
            maxLength="100"
            onChange={(event) => update('city', event.target.value)}
            placeholder={venue.city}
            autoComplete="address-level2"
          />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          {report.countryCode === 'US' ? 'State' : 'Region'}
          <input
            value={report.state}
            maxLength="100"
            onChange={(event) => update('state', event.target.value)}
            placeholder={venue.state}
            autoComplete="address-level1"
          />
        </label>
        <label>
          {report.countryCode === 'US' ? 'ZIP' : 'Postal Code'}
          <input
            value={report.zip}
            maxLength="40"
            onChange={(event) => update('zip', event.target.value)}
            placeholder={venue.zip}
            autoComplete="postal-code"
          />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Phone Type
          <select value={report.phoneType} onChange={(event) => update('phoneType', event.target.value)}>
            {notReportedOption()}
            {PHONE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Phone
          <input
            type="tel"
            value={report.phone}
            maxLength="80"
            onChange={(event) => update('phone', event.target.value)}
            placeholder={venue.phone}
            autoComplete="tel"
          />
        </label>
      </div>
      <label>
        Website
        <input
          type="url"
          inputMode="url"
          value={report.website}
          maxLength={SMS_LIMIT}
          onChange={(event) => update('website', event.target.value)}
          placeholder={venue.website}
          autoComplete="url"
        />
      </label>
      <div className="form-grid two">
        <label>
          Tables
          <input
            value={report.tableCount}
            onChange={(event) => update('tableCount', event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          Vibe
          <select value={report.vibe} onChange={(event) => update('vibe', event.target.value)}>
            {notReportedOption()}
            {VIBES.map((vibe) => (
              <option key={vibe}>{vibe}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Table Cost
          <input
            value={report.tableRate}
            maxLength={SMS_LIMIT}
            onChange={(event) => update('tableRate', event.target.value)}
          />
        </label>
        <label>
          Currency
          <select value={report.currencyCode} onChange={(event) => update('currencyCode', event.target.value)}>
            {CURRENCY_OPTIONS.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Drinks
        <input
          value={report.drinkCost}
          maxLength={SMS_LIMIT}
          onChange={(event) => update('drinkCost', event.target.value)}
        />
      </label>
      <div className="form-grid two">
        <label>
          Crowd Level
          <select
            value={report.crowdLevel}
            onChange={(event) => update('crowdLevel', event.target.value)}
          >
            {notReportedOption()}
            {CROWD_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Crowd Day
          <select value={report.crowdDay} onChange={(event) => update('crowdDay', event.target.value)}>
            {notReportedOption('No day')}
            {DAYS.map((day) => (
              <option key={day}>{day}</option>
            ))}
          </select>
        </label>
        <label>
          Crowd Time
          <select value={report.crowdTimeBucket} onChange={(event) => update('crowdTimeBucket', event.target.value)}>
            {notReportedOption('No time')}
            {TIME_BUCKETS.map((bucket) => (
              <option key={bucket.key} value={bucket.key}>
                {bucket.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="crowd-window-actions">
        <button className="secondary-button compact" type="button" onClick={addReportCrowdWindow}>
          Add Crowd Window
        </button>
      </div>
      {report.crowdSlots.length > 0 && (
        <div className="crowd-slot-list" aria-label="Added report crowd windows">
          {report.crowdSlots.map((slot, index) => (
            <span key={`${slot.day}-${slot.timeBucket}-${slot.crowdLevel}-${index}`}>
              {formatCrowdSlot(slot)}
              <button type="button" onClick={() => removeReportCrowdWindow(index)} aria-label={`Remove ${formatCrowdSlot(slot)}`}>
                Remove
              </button>
            </span>
          ))}
        </div>
      )}
      <label>
        Crowded When
        <input maxLength={SMS_LIMIT} value={report.busyTimes} onChange={(event) => update('busyTimes', event.target.value)} />
      </label>
      <label>
        Best Times To Go
        <input maxLength={SMS_LIMIT} value={report.bestTimes} onChange={(event) => update('bestTimes', event.target.value)} />
      </label>
      <label>
        Hours
        <input maxLength={SMS_LIMIT} value={report.hours} onChange={(event) => update('hours', event.target.value)} />
      </label>
      <div className="form-grid two">
        <label>
          Step-Free Entrance
          <select value={report.stepFreeEntrance} onChange={(event) => update('stepFreeEntrance', event.target.value)}>
            {notReportedOption()}
            {ACCESSIBILITY_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Accessible Restroom
          <select value={report.accessibleRestroom} onChange={(event) => update('accessibleRestroom', event.target.value)}>
            {notReportedOption()}
            {ACCESSIBILITY_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Accessible Parking
          <select value={report.accessibleParking} onChange={(event) => update('accessibleParking', event.target.value)}>
            {notReportedOption()}
            {ACCESSIBILITY_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Stairs
          <select value={report.stairs} onChange={(event) => update('stairs', event.target.value)}>
            {notReportedOption()}
            <option>Unknown</option>
            <option>No stairs</option>
            <option>Some stairs</option>
            <option>Stairs required</option>
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Elevator
          <select value={report.elevator} onChange={(event) => update('elevator', event.target.value)}>
            {notReportedOption()}
            <option>Unknown</option>
            <option>Available</option>
            <option>Not available</option>
            <option>Not needed</option>
          </select>
        </label>
      </div>
      <label>
        Accessibility Notes
        <input
          maxLength="160"
          value={report.accessibility}
          onChange={(event) => update('accessibility', event.target.value)}
        />
      </label>
      <div className="form-grid two">
        <label>
          ID
          <input maxLength={SMS_LIMIT} value={report.idRequirement} onChange={(event) => update('idRequirement', event.target.value)} />
        </label>
        <label>
          Age Range
          <input maxLength={SMS_LIMIT} value={report.ageRange} onChange={(event) => update('ageRange', event.target.value)} />
        </label>
      </div>
      <label>
        Description
        <input
          value={report.description}
          maxLength={SMS_LIMIT}
          onChange={(event) => update('description', event.target.value)}
        />
      </label>
      <label>
        Tips & Tricks
        <input
          value={report.tips}
          maxLength={SMS_LIMIT}
          onChange={(event) => update('tips', event.target.value)}
          placeholder="Table condition, league nights, parking, cash-only tables..."
        />
      </label>
      <label>
        Optional Image
        <input type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0])} />
      </label>
      {image.imageName && <p className="form-message">Image attached: {image.imageName}</p>}
      <fieldset>
        <legend>Amenities</legend>
        <div className="amenity-grid">
          {AMENITIES.map((amenity) => (
            <label key={amenity} className="check-row">
              <input
                type="checkbox"
                checked={report.amenities.includes(amenity)}
                onChange={() => toggleReportAmenity(amenity)}
              />
              {amenity}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Amenity Notes
        <input
          maxLength={SMS_LIMIT}
          value={report.amenitiesText}
          onChange={(event) => update('amenitiesText', event.target.value)}
          placeholder="Darts, jukebox, patio, lockers..."
        />
      </label>
      <button type="submit" className="secondary-button" disabled={!canContribute}>
        Save Report
      </button>
    </form>
  );
}

function AccuracyPanel({ venue, onVote, canContribute, userVote }) {
  const votes = venue.accuracyVotes || { up: 0, down: 0 };
  const status = getAccuracyStatus(venue);
  const label = getAccuracyLabel(venue);
  const score = votes.up - votes.down;

  return (
    <div className={`accuracy-panel ${status}`} aria-label="Venue accuracy voting">
      <div>
        <h3>
          <ShieldAlert size={18} aria-hidden="true" />
          Accuracy
        </h3>
        <p>
          {label}. {votes.up} accurate, {votes.down} inaccurate. Trust score {score}.
        </p>
      </div>
      <div className="vote-buttons" aria-label="Vote on venue accuracy">
        <button
          className={`vote-button ${userVote === 'up' ? 'active' : ''}`}
          type="button"
          onClick={() => onVote(venue.id, 'up')}
          aria-pressed={userVote === 'up'}
          disabled={!canContribute}
        >
          <ThumbsUp size={17} aria-hidden="true" />
          Accurate
        </button>
        <button
          className={`vote-button danger ${userVote === 'down' ? 'active' : ''}`}
          type="button"
          onClick={() => onVote(venue.id, 'down')}
          aria-pressed={userVote === 'down'}
          disabled={!canContribute}
        >
          <ThumbsDown size={17} aria-hidden="true" />
          Inaccurate
        </button>
      </div>
    </div>
  );
}

function ConfidencePanel({ venue }) {
  const confidenceRows = CONFIDENCE_FIELDS.map((field) => getFieldConfidence(venue, field.key));

  return (
    <div className="confidence-panel" aria-label="Crowdsourced confidence levels">
      <h3>Community Confidence</h3>
      <div className="confidence-grid">
        {confidenceRows.map((item) => (
          <div className={`confidence-row ${item.level}`} key={item.key}>
            <span>
              <b>{item.label}</b>
              <em>{item.value}</em>
            </span>
            <strong>{item.level}</strong>
            <small>
              {item.support}/{item.reportCount || 0} reports agree
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsPanel({ venue }) {
  const tips = getVenueTips(venue);

  return (
    <div className="tips-panel" aria-label="Best times and player tips">
      <h3>Best Times & Tips</h3>
      {tips.length ? (
        <ul>
          {tips.slice(0, 4).map((tip) => (
            <li key={`${tip.label}-${tip.value}`}>
              <b>{tip.label}</b>
              <span>{tip.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No tips yet. Add a report with the best times to go or local table advice.</p>
      )}
    </div>
  );
}

function LocalContextPanel({ venue, userLocation, currentTime }) {
  const distanceLabel = getDistanceLabel(getDistanceMeters(userLocation, venue));
  const nowInsight = getCurrentCrowdInsight(venue, currentTime);
  const tableRate = getFieldConsensus(venue, 'tableRate').value;
  const currencyCode = getFieldConsensus(venue, 'currencyCode').value;
  const crowdText = nowInsight.crowdLevel
    ? `${nowInsight.day} ${nowInsight.label}: ${nowInsight.crowdLevel} from ${nowInsight.reportCount} report${nowInsight.reportCount === 1 ? '' : 's'}`
    : `${nowInsight.day} ${nowInsight.label}: no crowd reports yet`;

  return (
    <div className="context-panel" aria-label="Real-time local context">
      <h3>Local Context</h3>
      <div className="context-grid">
        <span>
          <b>Distance</b>
          <em>{distanceLabel || 'Use location'}</em>
        </span>
        <span>
          <b>Right now</b>
          <em>{crowdText}</em>
        </span>
        <span>
          <b>Day type</b>
          <em>{nowInsight.isWeekend ? 'Weekend window' : 'Weekday window'}</em>
        </span>
        <span>
          <b>Cost</b>
          <em>{[tableRate, currencyCode && currencyCode !== 'No currency yet' ? currencyCode : ''].filter(Boolean).join(' · ') || 'No cost report yet'}</em>
        </span>
      </div>
    </div>
  );
}

function CrowdHistogramPanel({ venue, currentTime }) {
  const histogram = getCrowdHistogram(venue);
  const currentInsight = getCurrentCrowdInsight(venue, currentTime);
  const shortDays = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
  };
  const shortLevels = {
    Quiet: 'Q',
    Steady: 'S',
    Busy: 'B',
    Packed: 'P',
  };

  return (
    <div className="crowd-panel" aria-label="Crowdedness by day and time">
      <h3>Crowd Heatmap</h3>
      <table className="crowd-table">
        <caption>Anonymous reports by day and time band</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {TIME_BUCKETS.map((bucket) => (
              <th scope="col" key={bucket.key}>
                {bucket.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {histogram.map((row) => (
            <tr key={row.day}>
              <th scope="row">{shortDays[row.day]}</th>
              {row.cells.map((cell) => (
                <td key={cell.timeBucket}>
                  <span
                    className={`crowd-cell ${cell.crowdLevel.toLowerCase() || 'empty'} ${
                      cell.day === currentInsight.day && cell.timeBucket === currentInsight.timeBucket ? 'current' : ''
                    }`}
                    aria-label={`${row.day} ${cell.label}: ${cell.crowdLevel || 'No reports'} from ${cell.count} reports`}
                    title={`${row.day} ${cell.label}: ${cell.crowdLevel || 'No reports'} (${cell.count})`}
                  >
                    {cell.crowdLevel ? shortLevels[cell.crowdLevel] : '-'}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubmissionVotes({ report, onVote, canContribute, userVote }) {
  const votes = report.votes || { up: 0, down: 0 };

  return (
    <div className="submission-votes" aria-label="Vote on this submission">
      <button
        className={`vote-button ${userVote === 'up' ? 'active' : ''}`}
        type="button"
        onClick={() => onVote(report.id, 'up')}
        aria-label="Upvote this submission"
        aria-pressed={userVote === 'up'}
        disabled={!canContribute}
      >
        <ThumbsUp size={15} aria-hidden="true" />
        {votes.up}
      </button>
      <button
        className={`vote-button danger ${userVote === 'down' ? 'active' : ''}`}
        type="button"
        onClick={() => onVote(report.id, 'down')}
        aria-label="Downvote this submission"
        aria-pressed={userVote === 'down'}
        disabled={!canContribute}
      >
        <ThumbsDown size={15} aria-hidden="true" />
        {votes.down}
      </button>
    </div>
  );
}

function FieldVoteButtons({ submission, field, onVote, canContribute, userVote }) {
  const votes = submission.votes || { up: 0, down: 0 };
  const reportId = submission.reportId || submission.legacyReportId || submission.id;
  const label = field?.label || submission.fieldKey;

  return (
    <span className="field-votes" aria-label={`Vote on ${label}`}>
      <button
        className={`mini-vote ${userVote === 'up' ? 'active' : ''}`}
        type="button"
        onClick={() => onVote(reportId, submission.fieldKey, 'up')}
        aria-label={`Upvote ${label}`}
        aria-pressed={userVote === 'up'}
        disabled={!canContribute || !reportId}
      >
        <ThumbsUp size={13} aria-hidden="true" />
        {votes.up || 0}
      </button>
      <button
        className={`mini-vote danger ${userVote === 'down' ? 'active' : ''}`}
        type="button"
        onClick={() => onVote(reportId, submission.fieldKey, 'down')}
        aria-label={`Downvote ${label}`}
        aria-pressed={userVote === 'down'}
        disabled={!canContribute || !reportId}
      >
        <ThumbsDown size={13} aria-hidden="true" />
        {votes.down || 0}
      </button>
    </span>
  );
}

function CrowdSlotVoteButtons({ report, slot, onVote, canContribute, userVote }) {
  const votes = slot.votes || { up: 0, down: 0 };
  const bucketLabel = TIME_BUCKETS.find((bucket) => bucket.key === slot.timeBucket)?.label || slot.timeBucket;
  const label = `${slot.day} ${bucketLabel}`;

  return (
    <span className="field-votes" aria-label={`Vote on crowd timing ${label}`}>
      <button
        className={`mini-vote ${userVote === 'up' ? 'active' : ''}`}
        type="button"
        onClick={() => onVote(report.id, slot.id, 'up')}
        aria-label={`Upvote crowd timing ${label}`}
        aria-pressed={userVote === 'up'}
        disabled={!canContribute}
      >
        <ThumbsUp size={13} aria-hidden="true" />
        {votes.up || 0}
      </button>
      <button
        className={`mini-vote danger ${userVote === 'down' ? 'active' : ''}`}
        type="button"
        onClick={() => onVote(report.id, slot.id, 'down')}
        aria-label={`Downvote crowd timing ${label}`}
        aria-pressed={userVote === 'down'}
        disabled={!canContribute}
      >
        <ThumbsDown size={13} aria-hidden="true" />
        {votes.down || 0}
      </button>
    </span>
  );
}

function CommunitySubmissions({ venue, onFieldVote, onImageVote, onCrowdSlotVote, canContribute, getVoteReceipt }) {
  const reports = venue.reports || [];
  const images = venue.imageSubmissions || [];
  const fieldGroups = CONFIDENCE_FIELDS.map((field) => ({
    field,
    submissions: getFieldSubmissions(venue, field.key),
  })).reduce((groups, item) => {
    if (!item.submissions.length) return groups;
    const group = item.field.group || 'venue';
    groups[group] = [...(groups[group] || []), item];
    return groups;
  }, {});

  return (
    <div className="submissions-panel" aria-label="Anonymous community submissions">
      <h3>Community Fact Submissions</h3>
      {images.length > 0 && (
        <div className="photo-strip" aria-label="Community photo voting">
          {images.slice(0, 4).map((image) => (
            <figure key={image.id}>
              <img src={image.dataUrl} alt={image.name || 'Community submitted venue'} />
              <figcaption>
                <span>{image.name || 'Anonymous photo'}</span>
                <SubmissionVotes
                  report={{ id: image.id, votes: image.votes }}
                  onVote={(imageId, vote) => onImageVote(venue.id, imageId, vote)}
                  canContribute={canContribute}
                  userVote={getVoteReceipt(imageVoteKey(venue.id, image.id))}
                />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="fact-group-list">
        {Object.entries(fieldGroups).map(([group, items]) => (
          <section className="fact-group" key={group} aria-label={`${FIELD_GROUP_LABELS[group] || group} facts`}>
            <h4>{FIELD_GROUP_LABELS[group] || group}</h4>
            <div className="fact-row-list">
              {items.flatMap(({ field, submissions }) =>
                submissions.map((submission) => {
                  const reportId = submission.reportId || submission.legacyReportId || submission.id;
                  return (
                    <article className="fact-row" key={submission.id}>
                      <div>
                        <span className="submission-meta">{submission.createdAt || 'Community fact'}</span>
                        <b>{field.label}</b>
                        <p>{submission.value}</p>
                      </div>
                      <FieldVoteButtons
                        submission={submission}
                        field={field}
                        onVote={(reportId, fieldKey, vote) => onFieldVote(venue.id, reportId, fieldKey, vote)}
                        canContribute={canContribute}
                        userVote={getVoteReceipt(fieldVoteKey(venue.id, reportId, submission.fieldKey))}
                      />
                    </article>
                  );
                }),
              )}
            </div>
          </section>
        ))}
        {reports.some((report) => createCrowdReportsFromReport(report).length > 0) && (
          <section className="fact-group" aria-label="Crowd timing facts">
            <h4>Crowd Timing</h4>
            <div className="fact-row-list">
              {reports.flatMap((report) =>
                createCrowdReportsFromReport(report).map((slot) => {
                  const bucketLabel =
                    TIME_BUCKETS.find((bucket) => bucket.key === slot.timeBucket)?.label || slot.timeBucket;
                  return (
                    <article className="fact-row" key={slot.id}>
                      <div>
                        <span className="submission-meta">{slot.createdAt || report.createdAt || 'Community fact'}</span>
                        <b>{slot.day} {bucketLabel}</b>
                        <p>{slot.crowdLevel}</p>
                      </div>
                      <CrowdSlotVoteButtons
                        report={report}
                        slot={slot}
                        onVote={(reportId, slotId, vote) => onCrowdSlotVote(venue.id, reportId, slotId, vote)}
                        canContribute={canContribute}
                        userVote={getVoteReceipt(crowdSlotVoteKey(venue.id, report.id, slot.id))}
                      />
                    </article>
                  );
                }),
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function VenueDetails({
  venue,
  onReport,
  onVote,
  onReportVote,
  onFieldVote,
  onImageVote,
  onCrowdSlotVote,
  canContribute,
  userLocation,
  currentTime,
  getVoteReceipt,
}) {
  if (!venue) {
    return (
      <section className="detail-panel empty" id="details">
        <p>Select a venue to inspect details.</p>
      </section>
    );
  }
  const bestImage = getBestImageSubmission(venue);
  const heroImage = bestImage?.dataUrl || detailImage;
  const venueName = getFieldConsensus(venue, 'name').value;
  const venueType = getFieldConsensus(venue, 'type').value;
  const address = getFieldConsensus(venue, 'address').value;
  const city = getFieldConsensus(venue, 'city').value;
  const state = getFieldConsensus(venue, 'state').value;
  const zip = getFieldConsensus(venue, 'zip').value;
  const countryCode = getFieldConsensus(venue, 'countryCode').value;
  const phoneTypeRaw = getFieldConsensus(venue, 'phoneType').value;
  const phoneRaw = getFieldConsensus(venue, 'phone').value;
  const websiteRaw = getFieldConsensus(venue, 'website').value;
  const mapsUrlRaw = getFieldConsensus(venue, 'mapsUrl').value;
  const phoneType = phoneTypeRaw === 'No phone type yet' ? '' : phoneTypeRaw;
  const phone = phoneRaw === 'No phone yet' ? '' : phoneRaw;
  const website = websiteRaw === 'No website yet' ? '' : websiteRaw;
  const mapsUrl = mapsUrlRaw === 'No map URL yet' ? '' : mapsUrlRaw;
  const tableCount = getFieldConsensus(venue, 'tableCount').value;
  const vibe = getFieldConsensus(venue, 'vibe').value;
  const tableRate = getFieldConsensus(venue, 'tableRate').value;
  const currencyCode = getFieldConsensus(venue, 'currencyCode').value;
  const drinkCost = getFieldConsensus(venue, 'drinkCost').value;
  const crowdLevel = getFieldConsensus(venue, 'crowdLevel').value;
  const busyTimes = getFieldConsensus(venue, 'busyTimes').value;
  const hours = getFieldConsensus(venue, 'hours').value;
  const description = getFieldConsensus(venue, 'description').value;
  const stepFreeEntrance = getFieldConsensus(venue, 'stepFreeEntrance').value;
  const accessibleRestroom = getFieldConsensus(venue, 'accessibleRestroom').value;
  const accessibleParking = getFieldConsensus(venue, 'accessibleParking').value;
  const stairs = getFieldConsensus(venue, 'stairs').value;
  const elevator = getFieldConsensus(venue, 'elevator').value;
  const idRequirement = getFieldConsensus(venue, 'idRequirement').value;
  const ageRange = getFieldConsensus(venue, 'ageRange').value;
  const amenities = getAmenityList(getFieldConsensus(venue, 'amenities').value || venue.amenities);
  const websiteUrl = normalizeWebsiteUrl(website);
  const telUrl = phoneHref(phone);
  const consensusVenue = { ...venue, address, city, state, zip, countryCode };

  return (
    <section className="detail-panel" id="details" aria-labelledby="detail-heading">
      <div className="detail-hero">
        <img src={heroImage} alt="" />
        <div>
          <h2 id="detail-heading">{venueName}</h2>
          <p>
            <span className={`status-dot ${venue.openNow ? 'open' : 'closed'}`} />
            {hours}
          </p>
          <p>
            {city}, {state} · {venueType}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <span>
          <CircleDot size={24} aria-hidden="true" />
          <b>{tableCount || '?'}</b>
          Tables
        </span>
        <span>
          <Users size={24} aria-hidden="true" />
          <b>{vibe || '—'}</b>
          Vibe
        </span>
        <span>
          <Star size={24} aria-hidden="true" />
          <b>{tableRate || '—'}</b>
          Table Cost{currencyCode && currencyCode !== 'No currency yet' ? ` (${currencyCode})` : ''}
        </span>
        <span>
          <Beer size={24} aria-hidden="true" />
          <b>{drinkCost || '—'}</b>
          Drinks
        </span>
      </div>

      <div className="intel-strip">
        <span>{crowdLevel || 'Crowd not reported'}</span>
        <strong>{busyTimes || 'Busy times not reported yet - add a community report.'}</strong>
      </div>

      <LocalContextPanel venue={venue} userLocation={userLocation} currentTime={currentTime} />
      <CrowdHistogramPanel venue={venue} currentTime={currentTime} />
      <ConfidencePanel venue={venue} />
      <AccuracyPanel
        venue={venue}
        onVote={onVote}
        canContribute={canContribute}
        userVote={getVoteReceipt(venueVoteKey(venue.id))}
      />
      {!canContribute && <p className="contribution-lock">{contributionGateMessage(canContribute, venue)}</p>}
      <TipsPanel venue={venue} />
      <CommunitySubmissions
        venue={venue}
        onReportVote={onReportVote}
        onFieldVote={onFieldVote}
        onImageVote={onImageVote}
        onCrowdSlotVote={onCrowdSlotVote}
        canContribute={canContribute}
        getVoteReceipt={getVoteReceipt}
      />

      <div className="detail-section">
        <h3>About</h3>
        <p>{description}</p>
      </div>

      <div className="detail-section">
        <h3>Access & Entry</h3>
        <div className="detail-tags">
          <span>Step-free: {stepFreeEntrance}</span>
          <span>Restroom: {accessibleRestroom}</span>
          <span>Parking: {accessibleParking}</span>
          <span>Stairs: {stairs}</span>
          <span>Elevator: {elevator}</span>
          <span>ID: {idRequirement}</span>
          <span>Age: {ageRange}</span>
        </div>
      </div>

      <div className="detail-section">
        <h3>Amenities</h3>
        <div className="detail-tags">
          {amenities.map((amenity) => (
            <span key={amenity}>
              {amenity === 'Beer' ? <Beer size={15} /> : <Wifi size={15} />}
              {amenity}
            </span>
          ))}
        </div>
      </div>

      <div className="detail-section contact-list">
        {phone && (
          <span>
            <Phone size={17} aria-hidden="true" />
            <a href={telUrl}>{phoneType ? `${phoneType}: ` : ''}{phone}</a>
          </span>
        )}
        {website && (
          <span>
            <a href={websiteUrl} target="_blank" rel="noreferrer">
              {website}
            </a>
          </span>
        )}
        <span>
          <MapPin size={17} aria-hidden="true" />
          {formatVenueAddress(consensusVenue)}
        </span>
        <a href={mapsUrl || venue.mapsUrl} target="_blank" rel="noreferrer">
          Open pin in OpenStreetMap
        </a>
      </div>

      <ReportForm venue={venue} onReport={onReport} canContribute={canContribute} />
    </section>
  );
}

export function filterVenues(venues, filters, userLocation = null) {
  const query = filters.query.trim().toLowerCase();
  const city = filters.city.trim().toLowerCase();
  return venues
    .filter((venue) => {
      const venueName = getFieldConsensus(venue, 'name').value;
      const venueType = getFieldConsensus(venue, 'type').value;
      const venueCity = getFieldConsensus(venue, 'city').value;
      const venueState = getFieldConsensus(venue, 'state').value;
      const crowdLevel = getFieldConsensus(venue, 'crowdLevel').value;
      if (filters.type !== 'All' && venueType !== filters.type) return false;
      if (filters.crowdLevel !== 'All' && crowdLevel !== filters.crowdLevel) return false;
      if (city && !venueCity.toLowerCase().includes(city)) return false;
      if (!query) return true;
      return [
        venueName,
        venueCity,
        venueState,
        venueType,
        getFieldConsensus(venue, 'address').value,
        getFieldConsensus(venue, 'phone').value,
        getFieldConsensus(venue, 'website').value,
        getFieldConsensus(venue, 'vibe').value,
        getFieldConsensus(venue, 'description').value,
        getFieldConsensus(venue, 'tableRate').value,
        getFieldConsensus(venue, 'drinkCost').value,
        getFieldConsensus(venue, 'amenities').value,
        crowdLevel,
        getFieldConsensus(venue, 'busyTimes').value,
        getFieldConsensus(venue, 'bestTimes').value,
        getFieldConsensus(venue, 'tips').value,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      const aDisputed = getAccuracyStatus(a) === 'disputed' ? 1 : 0;
      const bDisputed = getAccuracyStatus(b) === 'disputed' ? 1 : 0;
      if (aDisputed !== bDisputed) return aDisputed - bDisputed;
      if (userLocation) {
        const distanceDelta = getDistanceMeters(userLocation, a) - getDistanceMeters(userLocation, b);
        if (Number.isFinite(distanceDelta) && distanceDelta !== 0) return distanceDelta;
      }
      return (b.reports?.length || 0) - (a.reports?.length || 0);
    });
}

export default function App() {
  const [venues, setVenues] = useState(() => loadVenues());
  const [selectedId, setSelectedId] = useState(() => loadVenues()[0]?.id);
  const [draftPin, setDraftPin] = useState(AUSTIN_CENTER);
  const [userLocation, setUserLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [formSeed, setFormSeed] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [remoteReady, setRemoteReady] = useState(false);
  const [voteReceipts, setVoteReceipts] = useState(() => loadVoteReceipts());
  const voteInFlightRef = useRef(new Set());
  const [filters, setFilters] = useState({
    query: '',
    city: '',
    type: 'All',
    crowdLevel: 'All',
  });

  useEffect(() => {
    saveVenues(venues);
  }, [venues]);

  useEffect(() => {
    saveVoteReceipts(voteReceipts);
  }, [voteReceipts]);

  useEffect(() => {
    let ignore = false;
    loadRemoteVenues()
      .then((remoteVenues) => {
        if (ignore || !remoteVenues.length) return;
        setVenues(remoteVenues);
        setSelectedId((current) => current || remoteVenues[0]?.id);
        setRemoteReady(true);
      })
      .catch(() => setRemoteReady(false));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!remoteReady || !userLocation) return;
    saveRemoteVenues(venues, userLocation).catch(() => {
      setLocationStatus('Saved locally. Server sync needs verified venue location or durable storage configuration.');
    });
  }, [remoteReady, userLocation, venues]);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const selectedVenue = venues.find((venue) => venue.id === selectedId) || venues[0];
  const getVoteReceipt = (key) => getReceiptVote(voteReceipts, key);

  function recordVoteReceipt(key, vote) {
    setVoteReceipts((current) => updateReceiptVote(current, key, vote));
  }

  async function commitVote({ target, vote, previousVote, receiptKey, fallback }) {
    if (voteInFlightRef.current.has(receiptKey)) return;
    voteInFlightRef.current.add(receiptKey);
    try {
      if (!remoteReady || !userLocation) throw new Error('Remote voting is not ready.');
      const remoteVenues = await saveRemoteVote({ target, vote, previousVote, location: userLocation });
      setVenues(remoteVenues);
    } catch {
      fallback();
      setLocationStatus('Saved locally. Server vote sync is unavailable right now.');
    } finally {
      voteInFlightRef.current.delete(receiptKey);
    }
    recordVoteReceipt(receiptKey, vote);
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Browser location is not available.');
      return;
    }
    setLocationStatus('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(nextPin);
        setDraftPin(nextPin);
        setFilters((current) => ({ ...current, city: '' }));
        setLocationStatus('Location found. Move the map pin if needed.');
      },
      () => setLocationStatus('Location permission was denied or unavailable.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleMapResult(result) {
    const lat = Number(result.lat);
    const lng = Number(result.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDraftPin({ lat, lng });
    }
    // Seed the Add-Venue form so a map search result is immediately addable.
    // New object each time so repeated picks of the same venue still re-seed.
    setFormSeed({ ...result, seededAt: result.id });
  }

  function handleAdd(venue) {
    const locationProof = createLocationProof(userLocation, venue);
    if (!locationProof) {
      setLocationStatus('Use My Location inside the mapped venue address before adding it.');
      return;
    }
    const verifiedVenue = {
      ...venue,
      locationProof: venue.locationProof || locationProof,
      accuracyVotes: createAccuracyVoteWithProof(venue.accuracyVotes, locationProof),
    };
    setVenues((current) => [verifiedVenue, ...current]);
    setSelectedId(venue.id);
    setFilters((current) => ({ ...current, city: venue.city, query: '' }));
  }

  function handleReport(venueId, report) {
    const venue = venues.find((item) => item.id === venueId);
    const locationProof = createLocationProof(userLocation, venue);
    if (!locationProof) {
      setLocationStatus('Use My Location inside this venue address before editing it.');
      return;
    }
    const verifiedReport = {
      ...report,
      locationProof,
      votes: createAccuracyVoteWithProof(report.votes, locationProof),
      crowdSlots: (report.crowdSlots || []).map((slot) => ({
        ...slot,
        locationProof,
        votes: createAccuracyVoteWithProof(slot.votes, locationProof),
      })),
    };
    setVenues((current) =>
      current.map((venue) => (venue.id === venueId ? mergeReportIntoVenue(venue, verifiedReport) : venue)),
    );
  }

  function handleVote(venueId, vote) {
    const venue = venues.find((item) => item.id === venueId);
    const locationProof = createLocationProof(userLocation, venue);
    if (!locationProof) {
      setLocationStatus('Use My Location inside this venue address before voting.');
      return;
    }
    const receiptKey = venueVoteKey(venueId);
    const previousVote = getVoteReceipt(receiptKey);
    const fallback = () =>
      setVenues((current) =>
        current.map((venue) =>
          venue.id === venueId ? applyVenueVote(venue, vote, locationProof, previousVote) : venue,
        ),
      );
    commitVote({ target: { type: 'venue', venueId }, vote, previousVote, receiptKey, fallback });
  }

  function handleReportVote(venueId, reportId, vote) {
    const venue = venues.find((item) => item.id === venueId);
    const locationProof = createLocationProof(userLocation, venue);
    if (!locationProof) {
      setLocationStatus('Use My Location inside this venue address before voting.');
      return;
    }
    const receiptKey = reportVoteKey(venueId, reportId);
    const previousVote = getVoteReceipt(receiptKey);
    const fallback = () =>
      setVenues((current) =>
        current.map((venue) =>
          venue.id === venueId ? applyReportVote(venue, reportId, vote, locationProof, previousVote) : venue,
        ),
      );
    commitVote({ target: { type: 'report', venueId, reportId }, vote, previousVote, receiptKey, fallback });
  }

  function handleFieldVote(venueId, reportId, fieldKey, vote) {
    const venue = venues.find((item) => item.id === venueId);
    const locationProof = createLocationProof(userLocation, venue);
    if (!locationProof) {
      setLocationStatus('Use My Location inside this venue address before voting.');
      return;
    }
    const receiptKey = fieldVoteKey(venueId, reportId, fieldKey);
    const previousVote = getVoteReceipt(receiptKey);
    const fallback = () =>
      setVenues((current) =>
        current.map((venue) =>
          venue.id === venueId ? applyFieldVote(venue, reportId, fieldKey, vote, locationProof, previousVote) : venue,
        ),
      );
    commitVote({ target: { type: 'field', venueId, reportId, fieldKey }, vote, previousVote, receiptKey, fallback });
  }

  function handleImageVote(venueId, imageId, vote) {
    const venue = venues.find((item) => item.id === venueId);
    const locationProof = createLocationProof(userLocation, venue);
    if (!locationProof) {
      setLocationStatus('Use My Location inside this venue address before voting.');
      return;
    }
    const receiptKey = imageVoteKey(venueId, imageId);
    const previousVote = getVoteReceipt(receiptKey);
    const fallback = () =>
      setVenues((current) =>
        current.map((venue) =>
          venue.id === venueId ? applyImageVote(venue, imageId, vote, locationProof, previousVote) : venue,
        ),
      );
    commitVote({ target: { type: 'image', venueId, imageId }, vote, previousVote, receiptKey, fallback });
  }

  function handleCrowdSlotVote(venueId, reportId, slotId, vote) {
    const venue = venues.find((item) => item.id === venueId);
    const locationProof = createLocationProof(userLocation, venue);
    if (!locationProof) {
      setLocationStatus('Use My Location inside this venue address before voting.');
      return;
    }
    const receiptKey = crowdSlotVoteKey(venueId, reportId, slotId);
    const previousVote = getVoteReceipt(receiptKey);
    const fallback = () =>
      setVenues((current) =>
        current.map((venue) =>
          venue.id === venueId ? applyCrowdSlotVote(venue, reportId, slotId, vote, locationProof, previousVote) : venue,
        ),
      );
    commitVote({ target: { type: 'crowd', venueId, reportId, slotId }, vote, previousVote, receiptKey, fallback });
  }

  return (
    <div className="app-shell">
      <Header
        city={filters.city}
        onUseLocation={handleUseLocation}
        locationStatus={locationStatus}
      />
      <main className="workspace">
        <Directory
          venues={venues}
          selectedId={selectedVenue?.id}
          onSelect={setSelectedId}
          filters={filters}
          setFilters={setFilters}
          userLocation={userLocation}
          currentTime={currentTime}
        />
        <div className="center-stack">
          <OpenMap
            venues={venues}
            selectedId={selectedVenue?.id}
            onSelect={setSelectedId}
            draftPin={draftPin}
            onPinChange={setDraftPin}
            onResultSelect={handleMapResult}
          />
          <AddVenueForm
            onAdd={handleAdd}
            draftPin={draftPin}
            onPinChange={setDraftPin}
            seed={formSeed}
            userLocation={userLocation}
          />
        </div>
        <VenueDetails
          venue={selectedVenue}
          onReport={handleReport}
          onVote={handleVote}
          onReportVote={handleReportVote}
          onFieldVote={handleFieldVote}
          onImageVote={handleImageVote}
          onCrowdSlotVote={handleCrowdSlotVote}
          canContribute={canContributeAtLocation(userLocation, selectedVenue)}
          userLocation={userLocation}
          currentTime={currentTime}
          getVoteReceipt={getVoteReceipt}
        />
      </main>
    </div>
  );
}
