'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Aircraft {
  hex: string;
  flight: string;
  registration: string;
  type: string;
  description: string;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  distanceKm: number | null;
  lat: number | null;
  lon: number | null;
  category: string;
}

type PermissionState = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported';

interface PresetAirport {
  name: string;
  code: string;
  lat: number;
  lon: number;
}

const PRESET_AIRPORTS: PresetAirport[] = [
  { name: 'London Heathrow', code: 'LHR', lat: 51.4700, lon: -0.4543 },
  { name: 'New York JFK', code: 'JFK', lat: 40.6413, lon: -73.7781 },
  { name: 'Tokyo Haneda', code: 'HND', lat: 35.5494, lon: 139.7798 },
  { name: 'Frankfurt Airport', code: 'FRA', lat: 50.0379, lon: 8.5622 },
];

interface LazyRouteInfo {
  callsign: string;
  airlineName: string | null;
  airlineIcao: string | null;
  origin: {
    icao: string | null;
    iata: string | null;
    name: string | null;
    country: string | null;
  } | null;
  destination: {
    icao: string | null;
    iata: string | null;
    name: string | null;
    country: string | null;
  } | null;
}

interface LazyAircraftInfo {
  manufacturer: string | null;
  modelName: string | null;
  icaoType: string | null;
  owner: string | null;
  photoUrl: string | null;
  photoThumbUrl: string | null;
}

// Sub-component for individual flight cards to handle lazy-loading route & details
function FlightCard({ ac, userCoords }: { ac: Aircraft; userCoords: { lat: number; lon: number } }) {
  const [routeInfo, setRouteInfo] = useState<LazyRouteInfo | null>(null);
  const [aircraftInfo, setAircraftInfo] = useState<LazyAircraftInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [logoFailed, setLogoFailed] = useState<boolean>(false);

  // Extract airline code from callsign (DLH123 -> DLH, AA23 -> AA)
  const getAirlineCode = (flight: string) => {
    const cleanFlight = flight.trim().replace(/[^a-zA-Z0-9]/g, '');
    const match = cleanFlight.match(/^([A-Za-z]{2,3})/);
    return match ? match[1].toUpperCase() : null;
  };

  const airlineCode = getAirlineCode(ac.flight);

  useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      setLoading(true);
      try {
        const queryParams = [];
        if (ac.flight && ac.flight !== '—') queryParams.push(`callsign=${encodeURIComponent(ac.flight)}`);
        if (ac.hex && ac.hex !== 'unknown') queryParams.push(`hex=${encodeURIComponent(ac.hex)}`);
        
        if (queryParams.length === 0) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/route-info?${queryParams.join('&')}`);
        if (!res.ok) throw new Error('Failed to load extra details');
        const data = await res.json();
        
        if (active) {
          setRouteInfo(data.route);
          setAircraftInfo(data.aircraft);
        }
      } catch (err) {
        console.error('Lazy load error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDetails();

    return () => {
      active = false;
    };
  }, [ac.flight, ac.hex]);

  const getCompassDirection = (bearing: number | null) => {
    if (bearing === null) return '—';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((bearing % 360) / 45)) % 8;
    return `${bearing}° ${directions[index]}`;
  };

  const knotsToKmh = (kts: number | null) => {
    if (kts === null) return '—';
    return `${Math.round(kts * 1.852)} km/h`;
  };

  const [photoFailed, setPhotoFailed] = useState<boolean>(false);

  return (
    <article className="flight-card hover-reveal">
      {/* Top Banner: Plane Photo if available */}
      {aircraftInfo?.photoUrl && !photoFailed && (
        <div className="flight-photo-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={aircraftInfo.photoUrl} 
            alt={`${aircraftInfo.manufacturer || ''} ${aircraftInfo.modelName || ''}`} 
            className="flight-photo"
            onError={() => setPhotoFailed(true)}
            loading="lazy"
          />
          <div className="photo-overlay"></div>
        </div>
      )}

      <div className="flight-card-header">
        <div className="flight-identity-row">
          {/* Airline Logo */}
          {airlineCode && !logoFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://airlabs.co/img/airline/m/${airlineCode}.png`}
              alt={`${airlineCode} logo`}
              className="airline-logo"
              onError={() => setLogoFailed(true)}
              loading="lazy"
            />
          )}
          <div className="flight-identity">
            <span className="flight-callsign">{ac.flight !== '—' ? ac.flight : 'No Callsign'}</span>
            <span className="flight-reg">
              {ac.registration !== '—' ? ac.registration : `Hex: ${ac.hex.toUpperCase()}`}
            </span>
          </div>
        </div>
        
        <div className="flight-distance">
          {ac.distanceKm !== null ? `${ac.distanceKm} KM` : 'DIST UNKNOWN'}
        </div>
      </div>

      <div className="flight-card-body">
        {/* Route Row (Origin -> Destination) */}
        <div className="route-container">
          <span className="route-header">ROUTE</span>
          {loading ? (
            <span className="loading-dots route-value">RESOLVING ROUTE</span>
          ) : routeInfo?.origin && routeInfo?.destination ? (
            <div className="route-display" title={`${routeInfo.origin.name} (${routeInfo.origin.country}) ➔ ${routeInfo.destination.name} (${routeInfo.destination.country})`}>
              <span className="airport-code" title={routeInfo.origin.name || ''}>
                {routeInfo.origin.iata || routeInfo.origin.icao || '???'}
              </span>
              <span className="route-arrow">➔</span>
              <span className="airport-code" title={routeInfo.destination.name || ''}>
                {routeInfo.destination.iata || routeInfo.destination.icao || '???'}
              </span>
            </div>
          ) : (
            <span className="route-value text-muted">SCHEDULE NOT FOUND</span>
          )}
        </div>

        {/* Technical Data Grid */}
        <div className="tech-telemetry-grid">
          <div className="tech-col">
            <span className="tech-label">EQUIPMENT</span>
            <span className="tech-value font-mono highlight-cyan">
              {loading ? (
                <span className="loading-dots">RESOLVING</span>
              ) : aircraftInfo?.manufacturer ? (
                `${aircraftInfo.manufacturer} ${aircraftInfo.modelName || aircraftInfo.icaoType || ''}`
              ) : ac.type !== '—' ? (
                ac.type
              ) : (
                'UNKNOWN MODEL'
              )}
            </span>
          </div>

          {aircraftInfo?.owner && (
            <div className="tech-col">
              <span className="tech-label">OPERATOR</span>
              <span className="tech-value font-mono">
                {aircraftInfo.owner}
              </span>
            </div>
          )}

          <div className="tech-grid-2x2">
            <div className="tech-col">
              <span className="tech-label">ALTITUDE</span>
              <span className="tech-value font-mono text-green">
                {ac.altitude !== null ? `${ac.altitude.toLocaleString()} FT` : '—'}
              </span>
            </div>
            <div className="tech-col">
              <span className="tech-label">SPEED</span>
              <span className="tech-value font-mono text-green">
                {ac.speed !== null ? `${ac.speed} KTS` : '—'}
                <span className="sub-metric">{ac.speed !== null && ` (${knotsToKmh(ac.speed)})`}</span>
              </span>
            </div>
            <div className="tech-col">
              <span className="tech-label">HEADING</span>
              <span className="tech-value font-mono text-green">
                {getCompassDirection(ac.heading)}
              </span>
            </div>
            <div className="tech-col">
              <span className="tech-label">CATEGORY</span>
              <span className="tech-value font-mono">
                {ac.category !== '—' ? ac.category : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded airport tooltip detail display */}
      {!loading && routeInfo?.origin && (
        <div className="flight-card-footer font-mono">
          <div className="footer-route-detail">
            DEP: <span className="highlight-code">{routeInfo.origin.iata || routeInfo.origin.icao || '???'}</span> <span className="airport-name-footer">{routeInfo.origin.name} ({routeInfo.origin.country})</span>
          </div>
          <div className="footer-route-detail">
            ARR: <span className="highlight-code">{routeInfo.destination?.iata || routeInfo.destination?.icao || '???'}</span> <span className="airport-name-footer">{routeInfo.destination?.name} ({routeInfo.destination?.country})</span>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Home() {
  // Geolocation States
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Dynamic Theme States
  type ThemeType = 'default' | 'dark-blue' | 'pink' | 'light-blue';
  const [theme, setTheme] = useState<ThemeType>('default');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    const themes: ThemeType[] = ['default', 'dark-blue', 'pink', 'light-blue'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Manual Mode & Search States
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [customLocationName, setCustomLocationName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Flight Data States
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(5); // default 5km
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Throttling State for Manual Refresh
  const [cooldown, setCooldown] = useState<number>(0);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Flight Data
  const fetchFlights = useCallback(async (latitude: number, longitude: number, currentRadius: number) => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(
        `/api/aircraft?lat=${latitude}&lon=${longitude}&radiusKm=${currentRadius}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch flight data');
      }
      const data = await response.json();
      setAircrafts(data.aircraft || []);
      setVisibleCount(5);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'An error occurred while fetching nearby flight data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Request Location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission('unsupported');
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setPermission('checking');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        setPermission('granted');
        setIsManualMode(false);
        setCustomLocationName(null);
        setLocationError(null);
        fetchFlights(latitude, longitude, radiusKm);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setPermission('denied');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. Please enable location services or search for a location manually.');
        } else {
          setLocationError('Unable to retrieve your location. Please check your GPS signal or search manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchFlights, radiusKm]);

  // Initial Location request
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        } else if (result.state === 'prompt') {
          setPermission('prompt');
        } else {
          setPermission('denied');
          setLocationError('Location permission was denied. Please enable location services or search for a location manually.');
        }

        result.onchange = () => {
          if (result.state === 'granted') {
            requestLocation();
          } else if (result.state === 'denied') {
            setPermission('denied');
            setCoords(null);
            setLocationError('Location permission was denied. Please enable location services or search for a location manually.');
          } else {
            setPermission('prompt');
            setCoords(null);
          }
        };
      }).catch(() => {
        setPermission('prompt');
      });
    } else {
      setPermission('prompt');
    }
  }, [requestLocation]);

  // Auto-Refresh Setup (every 10 seconds, default off)
  useEffect(() => {
    if (autoRefresh && permission === 'granted' && coords) {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);

      autoRefreshTimerRef.current = setInterval(() => {
        fetchFlights(coords.lat, coords.lon, radiusKm);
      }, 10000);
    }

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, permission, coords, radiusKm, fetchFlights]);

  // Handle Manual Refresh with 10s cooldown
  const handleManualRefresh = () => {
    if (cooldown > 0 || !coords) return;

    fetchFlights(coords.lat, coords.lon, radiusKm);

    setCooldown(10);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, []);

  // Update flights when radius changes
  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    if (coords) {
      fetchFlights(coords.lat, coords.lon, newRadius);
    }
  };

  // Geocoding / Manual Input Search Handler
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);

    const coordsRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (coordsRegex.test(searchQuery.trim())) {
      const [latStr, lonStr] = searchQuery.split(',');
      const lat = parseFloat(latStr.trim());
      const lon = parseFloat(lonStr.trim());
      setCoords({ lat, lon });
      setCustomLocationName(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      setPermission('granted');
      setIsManualMode(true);
      fetchFlights(lat, lon, radiusKm);
      setSearchLoading(false);
      setSearchQuery('');
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'WhatsOverMyHeadApp/1.0',
          },
        }
      );
      if (!response.ok) throw new Error('Geocoding service unavailable');
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const name = data[0].display_name.split(',')[0];
        setCoords({ lat, lon });
        setCustomLocationName(name);
        setPermission('granted');
        setIsManualMode(true);
        fetchFlights(lat, lon, radiusKm);
        setSearchQuery('');
      } else {
        setSearchError('Location not found. Try a city name or "lat, lon" coordinates.');
      }
    } catch (err: any) {
      console.error(err);
      setSearchError('Failed to search location. Try direct coordinates (e.g. 51.47, -0.45).');
    } finally {
      setSearchLoading(false);
    }
  };

  // Select Preset Airport
  const selectPreset = (airport: PresetAirport) => {
    setCoords({ lat: airport.lat, lon: airport.lon });
    setCustomLocationName(`${airport.name} (${airport.code})`);
    setPermission('granted');
    setIsManualMode(true);
    fetchFlights(airport.lat, airport.lon, radiusKm);
  };

  // Reset to GPS
  const handleResetToGps = () => {
    requestLocation();
  };

  return (
    <div className="container">
      <header className="header">
        <div className="header-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="title-wrapper" style={{ margin: 0 }}>
            <span className="radar-icon-pulse"></span>
            <h1 id="app-title" className="gradient-text font-mono">What&apos;s Over My Head</h1>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeType)}
            className="secondary-btn font-mono theme-select-dropdown"
            style={{ fontSize: '1.1rem', padding: '0.4rem 0.8rem', cursor: 'pointer', appearance: 'auto', outline: 'none' }}
          >
            <option value="default">THEME: DEFAULT (DARK)</option>
            <option value="dark-blue">THEME: DARK BLUE</option>
            <option value="pink">THEME: GIRLY PINK (LIGHT)</option>
            <option value="light-blue">THEME: LIGHT BLUE</option>
          </select>
        </div>
        <p className="subtitle font-mono" style={{ textAlign: 'left' }}>Live ADS-B Telemetry Scanner</p>
      </header>

      <main className="main-content">
        {permission === 'checking' && (
          <div className="card status-card loading-state font-mono">
            <div className="spinner"></div>
            <p className="loading-dots">Initializing Satellite Links</p>
          </div>
        )}

        {(permission === 'prompt' || permission === 'denied' || permission === 'unsupported') && (
          <div className="card status-card action-needed font-mono">
            <div className="alert-illustration">
              {permission === 'denied' ? '❌' : permission === 'unsupported' ? '⚠️' : '📡'}
            </div>
            <h2>
              {permission === 'denied'
                ? 'Access Denied'
                : permission === 'unsupported'
                ? 'Browser Unsupported'
                : 'Location Required'}
            </h2>
            <p>
              {permission === 'denied'
                ? locationError
                : 'Telemetry scanner requires geographic coordinates to filter localized air traffic.'}
            </p>
            
            {permission === 'prompt' && (
              <button className="primary-btn pulse-glow" onClick={requestLocation}>
                Acquire GPS Location
              </button>
            )}

            {permission === 'denied' && (
              <button className="secondary-btn" onClick={requestLocation} style={{ marginBottom: '0.5rem' }}>
                Retry GPS Location
              </button>
            )}

            <div className="manual-divider">
              <span>Manual Target Selection</span>
            </div>

            {/* Manual Search Form */}
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter city (e.g. Frankfurt) or 'lat, lon'"
                className="search-input font-mono"
                disabled={searchLoading}
              />
              <button type="submit" className="search-btn font-mono" disabled={searchLoading}>
                {searchLoading ? <span className="mini-spinner"></span> : 'Scan'}
              </button>
            </form>
            {searchError && <p className="search-error font-mono">{searchError}</p>}

            {/* Presets */}
            <div className="presets-section">
              <p className="presets-title">High-Density Radar Zones:</p>
              <div className="preset-badges">
                {PRESET_AIRPORTS.map((airport) => (
                  <button
                    key={airport.code}
                    onClick={() => selectPreset(airport)}
                    className="preset-badge-btn font-mono"
                  >
                    {airport.code} ({airport.name.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {permission === 'granted' && coords && (
          <div className="dashboard">
            {/* Custom Location Indicator Banner */}
            {isManualMode && (
              <div className="location-banner font-mono">
                <span className="location-pin">📡</span>
                <span className="location-text">
                  Scanning Coordinates: <span className="location-name">{customLocationName || 'Custom'}</span>
                </span>
                <button onClick={handleResetToGps} className="reset-gps-btn font-mono">
                  Reset to Local GPS
                </button>
              </div>
            )}

            {/* Control Panel */}
            <div className="card control-panel font-mono">
              {/* Manual search inside dashboard */}
              <div className="dashboard-search-row">
                <form onSubmit={handleSearch} className="search-form compact-search">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search city or 'lat, lon'"
                    className="search-input font-mono"
                    disabled={searchLoading}
                  />
                  <button type="submit" className="search-btn font-mono" disabled={searchLoading}>
                    {searchLoading ? <span className="mini-spinner"></span> : 'Scan'}
                  </button>
                </form>
                
                {/* Presets in dashboard */}
                <div className="dashboard-presets">
                  {PRESET_AIRPORTS.map((airport) => (
                    <button
                      key={airport.code}
                      onClick={() => selectPreset(airport)}
                      className="preset-shortcut-btn font-mono"
                      title={airport.name}
                    >
                      {airport.code}
                    </button>
                  ))}
                </div>
              </div>
              {searchError && <p className="search-error text-left font-mono">{searchError}</p>}

              <div className="control-group">
                <label htmlFor="radius-slider" className="control-label">
                  Scan Range: <span className="highlight-text">{radiusKm} KM</span>
                </label>
                <div className="slider-container">
                  <span className="slider-bound">1KM</span>
                  <input
                    id="radius-slider"
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={radiusKm}
                    onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                    className="modern-slider"
                  />
                  <span className="slider-bound">20KM</span>
                </div>
              </div>

              <div className="refresh-actions">
                <button
                  id="refresh-btn"
                  className="secondary-btn font-mono"
                  onClick={handleManualRefresh}
                  disabled={cooldown > 0 || loading}
                >
                  {loading ? (
                    <>
                      <span className="mini-spinner"></span> Scanning...
                    </>
                  ) : cooldown > 0 ? (
                    `Cooldown: ${cooldown}s`
                  ) : (
                    'Force Skies Scan'
                  )}
                </button>

                <div className="auto-refresh-control">
                  <label className="auto-refresh-toggle font-mono">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="toggle-checkbox"
                    />
                    <span>AUTO SCAN (10S)</span>
                  </label>
                  {lastUpdated && (
                    <span className="last-updated">
                      Updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content States */}
            {loading && aircrafts.length === 0 ? (
              <div className="card status-card loading-state font-mono">
                <div className="spinner"></div>
                <p className="loading-dots">Scanning Sky Vector Transponders</p>
              </div>
            ) : fetchError ? (
              <div className="card status-card error-state font-mono">
                <div className="alert-illustration">⚠️</div>
                <h2>Retrieval Failed</h2>
                <p className="error-message">{fetchError}</p>
                <button className="primary-btn font-mono" onClick={() => fetchFlights(coords.lat, coords.lon, radiusKm)}>
                  Retry Scan
                </button>
              </div>
            ) : aircrafts.length === 0 ? (
              <div className="card empty-card font-mono">
                <div className="empty-illustration">📡</div>
                <h3>No Flight Traffic Detected</h3>
                <p>No active transponders matched vector criteria within {radiusKm}KM radius.</p>
                <p className="empty-tip">Tip: Increase scan range slider or trigger preset airport zones (e.g. JFK or LHR) to verify feed parsing.</p>
              </div>
            ) : (
              <div className="flight-results font-mono">
                <div className="results-summary">
                  Aircraft in Range: <span className="highlight-text">{aircrafts.length}</span>
                </div>
                
                <div className="flight-grid">
                  {aircrafts.slice(0, visibleCount).map((ac) => (
                    <FlightCard key={ac.hex} ac={ac} userCoords={coords} />
                  ))}
                </div>
                {aircrafts.length > visibleCount && (
                  <div className="load-more-container">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 5)}
                      className="secondary-btn font-mono"
                      style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                    >
                      Load More Aircraft (+{Math.min(5, aircrafts.length - visibleCount)})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer font-mono">
        <p>Data Source: Community ODbL transponder aggregates.</p>
        <p className="privacy-badge">🔒 Coordinates parsed locally only.</p>
        <p className="made-by" style={{ marginTop: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
          made by{' '}
          <a
            href="https://alpher03.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            alpher03
          </a>
          <span className="nerd-barcode" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', marginLeft: '4px', opacity: 0.6 }}>
            {[1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3].map((w, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  width: `${w}px`,
                  height: '12px',
                  backgroundColor: 'currentColor'
                }}
              />
            ))}
          </span>
        </p>
      </footer>
    </div>
  );
}
