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
  Star,
  Users,
  Wifi,
} from 'lucide-react';
import detailImage from '../assets/poolhall-detail.png';
import {
  AMENITIES,
  CROWD_LEVELS,
  VENUE_TYPES,
  VIBES,
  createOpenStreetMapUrl,
  createReportId,
  createVenueId,
  mergeReportIntoVenue,
} from './venues.js';
import { loadVenues, saveVenues } from './storage.js';
import { searchVenueByName } from './venueLookup.js';

const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 };

const defaultForm = {
  name: '',
  type: 'Pool Hall',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  website: '',
  tableCount: '8',
  vibe: 'Chill',
  tableRate: '$12/hr',
  drinkCost: '$6 beer',
  crowdLevel: 'Steady',
  busyTimes: 'Friday after 8 PM',
  hours: '11:00 AM - 2:00 AM',
  description: '',
  amenities: ['Beer', 'Parking'],
  lat: AUSTIN_CENTER.lat,
  lng: AUSTIN_CENTER.lng,
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

function Directory({ venues, selectedId, onSelect, filters, setFilters }) {
  const filteredVenues = useMemo(() => filterVenues(venues, filters), [venues, filters]);

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
        <span>Community reports, newest first</span>
      </div>

      <div className="venue-list">
        {filteredVenues.map((venue) => (
          <button
            className={`venue-row ${venue.id === selectedId ? 'selected' : ''}`}
            key={venue.id}
            type="button"
            onClick={() => onSelect(venue.id)}
          >
            <span className={`status-dot ${venue.openNow ? 'open' : 'closed'}`} />
            <span className="venue-summary">
              <strong>{venue.name}</strong>
              <span>
                {venue.city}, {venue.state} · {venue.type} · {venue.tableCount || '?'} tables
              </span>
              <span>
                {[venue.tableRate, venue.drinkCost, venue.crowdLevel]
                  .filter(Boolean)
                  .join(' · ') || 'No community reports yet'}
              </span>
              <span className="tag-row">
                {[venue.vibe, ...(venue.amenities || []).slice(0, 2)]
                  .filter(Boolean)
                  .map((tag) => (
                    <em key={tag}>{tag}</em>
                  ))}
              </span>
            </span>
            <span className="row-side">
              <b>{venue.reports?.length || 0} reports</b>
              <span>{venue.busyTimes}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function OpenMap({ venues, selectedId, onSelect, draftPin, onPinChange }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layerRef = useRef(null);

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
          L.circleMarker([venue.lat, venue.lng], {
            radius: selected ? 10 : 7,
            color: selected ? '#f5af19' : '#166534',
            fillColor: selected ? '#f5af19' : '#35b46f',
            fillOpacity: 0.95,
            weight: 2,
          })
            .addTo(layerRef.current)
            .bindTooltip(`${venue.name} · ${venue.tableCount || '?'} tables`)
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
      <div className="map-canvas" ref={containerRef} aria-label="OpenStreetMap venue map" />
      <div className="pin-readout">
        <Crosshair size={16} aria-hidden="true" />
        New pin: {draftPin.lat.toFixed(4)}, {draftPin.lng.toFixed(4)}
      </div>
    </section>
  );
}

function AddVenueForm({ onAdd, draftPin, onPinChange }) {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState('');
  const [lookupStatus, setLookupStatus] = useState('');
  const [lookupResults, setLookupResults] = useState([]);

  useEffect(() => {
    setForm((current) => ({ ...current, lat: draftPin.lat, lng: draftPin.lng }));
  }, [draftPin]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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
      phone: result.phone || current.phone,
      website: result.website || current.website,
      lat: Number.isFinite(nextLat) ? nextLat : current.lat,
      lng: Number.isFinite(nextLng) ? nextLng : current.lng,
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

  function handleSubmit(event) {
    event.preventDefault();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.name.trim() || !form.city.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage('Add a venue name, city, and map pin.');
      return;
    }

    const report = {
      id: createReportId(),
      reporter: 'Community member',
      tableCount: form.tableCount,
      vibe: form.vibe,
      tableRate: form.tableRate,
      drinkCost: form.drinkCost,
      crowdLevel: form.crowdLevel,
      busyTimes: form.busyTimes,
      amenities: form.amenities,
      createdAt: new Date().toLocaleString(),
    };

    const venue = {
      ...form,
      id: createVenueId(form.name),
      source: 'community',
      name: form.name.trim(),
      address: form.address.trim() || 'Dropped pin',
      city: form.city.trim(),
      state: form.state.trim().toUpperCase() || 'TX',
      zip: form.zip.trim(),
      tableCount: Number(form.tableCount),
      lat,
      lng,
      distance: 0,
      price: '$$',
      openNow: true,
      mapsUrl: createOpenStreetMapUrl(lat, lng),
      description:
        form.description.trim() ||
        `${form.name.trim()} is a community-added ${form.type.toLowerCase()} with ${form.tableCount} tables.`,
      amenities: form.amenities.length ? form.amenities : ['Parking'],
      reports: [report],
    };

    onAdd(venue);
    setForm({ ...defaultForm, lat: draftPin.lat, lng: draftPin.lng });
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
          />
        </label>
        <div className="form-grid">
          <label>
            City
            <input
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder="Austin"
            />
          </label>
          <label>
            State
            <input
              value={form.state}
              onChange={(event) => updateField('state', event.target.value)}
              maxLength="2"
            />
          </label>
          <label>
            ZIP
            <input value={form.zip} onChange={(event) => updateField('zip', event.target.value)} />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="(503) 555-0101"
            />
          </label>
          <label>
            Website
            <input
              value={form.website}
              onChange={(event) => updateField('website', event.target.value)}
              placeholder="https://example.com"
            />
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
            />
          </label>
          <label>
            Vibe
            <select value={form.vibe} onChange={(event) => updateField('vibe', event.target.value)}>
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
              placeholder="$12/hr"
            />
          </label>
          <label>
            Drinks
            <input
              value={form.drinkCost}
              onChange={(event) => updateField('drinkCost', event.target.value)}
              placeholder="$6 beer"
            />
          </label>
        </div>
        <label>
          Crowd Level
          <select
            value={form.crowdLevel}
            onChange={(event) => updateField('crowdLevel', event.target.value)}
          >
            {CROWD_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <label>
          Crowded When
          <input
            value={form.busyTimes}
            onChange={(event) => updateField('busyTimes', event.target.value)}
            placeholder="Friday after 8 PM"
          />
        </label>
        <label>
          Short Description
          <textarea
            value={form.description}
            maxLength="200"
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
        <button className="submit-button" type="submit">
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

function ReportForm({ venue, onReport }) {
  const [report, setReport] = useState({
    tableCount: venue?.tableCount || 8,
    vibe: venue?.vibe || 'Chill',
    tableRate: venue?.tableRate || '$12/hr',
    drinkCost: venue?.drinkCost || '$6 beer',
    crowdLevel: venue?.crowdLevel || 'Steady',
    busyTimes: venue?.busyTimes || 'Friday after 8 PM',
  });

  useEffect(() => {
    setReport({
      tableCount: venue?.tableCount || 8,
      vibe: venue?.vibe || 'Chill',
      tableRate: venue?.tableRate || '$12/hr',
      drinkCost: venue?.drinkCost || '$6 beer',
      crowdLevel: venue?.crowdLevel || 'Steady',
      busyTimes: venue?.busyTimes || 'Friday after 8 PM',
    });
  }, [venue?.id]);

  function update(field, value) {
    setReport((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onReport(venue.id, {
      id: createReportId(),
      reporter: 'Community member',
      ...report,
      tableCount: Number(report.tableCount),
      amenities: venue.amenities || [],
      createdAt: new Date().toLocaleString(),
    });
  }

  return (
    <form className="report-form" onSubmit={submit} aria-label="Update venue report">
      <h3>Update Local Intel</h3>
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
            {VIBES.map((vibe) => (
              <option key={vibe}>{vibe}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Table Cost
          <input value={report.tableRate} onChange={(event) => update('tableRate', event.target.value)} />
        </label>
        <label>
          Drinks
          <input value={report.drinkCost} onChange={(event) => update('drinkCost', event.target.value)} />
        </label>
      </div>
      <label>
        Crowd Level
        <select
          value={report.crowdLevel}
          onChange={(event) => update('crowdLevel', event.target.value)}
        >
          {CROWD_LEVELS.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </label>
      <label>
        Crowded When
        <input value={report.busyTimes} onChange={(event) => update('busyTimes', event.target.value)} />
      </label>
      <button type="submit" className="secondary-button">
        Save Report
      </button>
    </form>
  );
}

function VenueDetails({ venue, onReport }) {
  if (!venue) {
    return (
      <section className="detail-panel empty" id="details">
        <p>Select a venue to inspect details.</p>
      </section>
    );
  }

  return (
    <section className="detail-panel" id="details" aria-labelledby="detail-heading">
      <div className="detail-hero">
        <img src={detailImage} alt="" />
        <div>
          <h2 id="detail-heading">{venue.name}</h2>
          <p>
            <span className={`status-dot ${venue.openNow ? 'open' : 'closed'}`} />
            {venue.hours}
          </p>
          <p>
            {venue.city}, {venue.state} · {venue.type}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <span>
          <CircleDot size={24} aria-hidden="true" />
          <b>{venue.tableCount || '?'}</b>
          Tables
        </span>
        <span>
          <Users size={24} aria-hidden="true" />
          <b>{venue.vibe}</b>
          Vibe
        </span>
        <span>
          <Star size={24} aria-hidden="true" />
          <b>{venue.tableRate}</b>
          Table Cost
        </span>
        <span>
          <Beer size={24} aria-hidden="true" />
          <b>{venue.drinkCost}</b>
          Drinks
        </span>
      </div>

      <div className="intel-strip">
        <span>{venue.crowdLevel}</span>
        <strong>{venue.busyTimes}</strong>
      </div>

      <div className="detail-section">
        <h3>About</h3>
        <p>{venue.description}</p>
      </div>

      <div className="detail-section">
        <h3>Amenities</h3>
        <div className="detail-tags">
          {(venue.amenities || []).map((amenity) => (
            <span key={amenity}>
              {amenity === 'Beer' ? <Beer size={15} /> : <Wifi size={15} />}
              {amenity}
            </span>
          ))}
        </div>
      </div>

      <div className="detail-section contact-list">
        {venue.phone && (
          <span>
            <Phone size={17} aria-hidden="true" />
            {venue.phone}
          </span>
        )}
        {venue.website && <span>{venue.website}</span>}
        <span>
          <MapPin size={17} aria-hidden="true" />
          {venue.address}, {venue.city}, {venue.state} {venue.zip}
        </span>
        <a href={venue.mapsUrl} target="_blank" rel="noreferrer">
          Open pin in OpenStreetMap
        </a>
      </div>

      <ReportForm venue={venue} onReport={onReport} />
    </section>
  );
}

export function filterVenues(venues, filters) {
  const query = filters.query.trim().toLowerCase();
  const city = filters.city.trim().toLowerCase();
  return venues
    .filter((venue) => {
      if (filters.type !== 'All' && venue.type !== filters.type) return false;
      if (filters.crowdLevel !== 'All' && venue.crowdLevel !== filters.crowdLevel) return false;
      if (city && !venue.city.toLowerCase().includes(city)) return false;
      if (!query) return true;
      return [
        venue.name,
        venue.city,
        venue.state,
        venue.type,
        venue.vibe,
        venue.description,
        venue.tableRate,
        venue.drinkCost,
        venue.crowdLevel,
        venue.busyTimes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => (b.reports?.length || 0) - (a.reports?.length || 0));
}

export default function App() {
  const [venues, setVenues] = useState(() => loadVenues());
  const [selectedId, setSelectedId] = useState(() => loadVenues()[0]?.id);
  const [draftPin, setDraftPin] = useState(AUSTIN_CENTER);
  const [locationStatus, setLocationStatus] = useState('');
  const [filters, setFilters] = useState({
    query: '',
    city: '',
    type: 'All',
    crowdLevel: 'All',
  });

  useEffect(() => {
    saveVenues(venues);
  }, [venues]);

  const selectedVenue = venues.find((venue) => venue.id === selectedId) || venues[0];

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
        setDraftPin(nextPin);
        setFilters((current) => ({ ...current, city: '' }));
        setLocationStatus('Location found. Move the map pin if needed.');
      },
      () => setLocationStatus('Location permission was denied or unavailable.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleAdd(venue) {
    setVenues((current) => [venue, ...current]);
    setSelectedId(venue.id);
    setFilters((current) => ({ ...current, city: venue.city, query: '' }));
  }

  function handleReport(venueId, report) {
    setVenues((current) =>
      current.map((venue) => (venue.id === venueId ? mergeReportIntoVenue(venue, report) : venue)),
    );
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
        />
        <div className="center-stack">
          <OpenMap
            venues={venues}
            selectedId={selectedVenue?.id}
            onSelect={setSelectedId}
            draftPin={draftPin}
            onPinChange={setDraftPin}
          />
          <AddVenueForm onAdd={handleAdd} draftPin={draftPin} onPinChange={setDraftPin} />
        </div>
        <VenueDetails venue={selectedVenue} onReport={handleReport} />
      </main>
    </div>
  );
}
