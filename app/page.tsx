'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Aircraft, PermissionState, PresetAirport, ThemeType } from './types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FlightCard from '../components/FlightCard';
import SearchCard from '../components/SearchCard';
import ControlPanel from '../components/ControlPanel';

const PRESET_AIRPORTS: PresetAirport[] = [
  { code: 'JFK', name: 'John F. Kennedy Intl', lat: 40.6413, lon: -73.7781 },
  { code: 'LHR', name: 'London Heathrow', lat: 51.4700, lon: -0.4543 },
  { code: 'HND', name: 'Tokyo Haneda', lat: 35.5494, lon: 139.7798 },
  { code: 'FRA', name: 'Frankfurt Airport', lat: 50.0379, lon: 8.5622 },
  { code: 'DXB', name: 'Dubai International', lat: 25.2532, lon: 55.3657 },
  { code: 'SIN', name: 'Singapore Changi', lat: 1.3644, lon: 103.9915 },
  { code: 'SYD', name: 'Sydney Kingsford Smith', lat: -33.9461, lon: 151.1772 }
];

export default function Home() {
  // Geolocation States
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Dynamic Theme States
  const [theme, setTheme] = useState<ThemeType>('default');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

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

  // Sync radiusKm to a ref so requestLocation does not trigger permissions check effects on slider change
  const radiusKmRef = useRef<number>(radiusKm);
  useEffect(() => {
    radiusKmRef.current = radiusKm;
  }, [radiusKm]);

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
        fetchFlights(latitude, longitude, radiusKmRef.current);
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
  }, [fetchFlights]);

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

  // Update flights when radius changes (manual scan is now required to trigger query)
  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
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

  // Load Test Flights for POC/demo mode
  const loadTestFlights = () => {
    const DUMMY_AIRCRAFTS: Aircraft[] = [
      {
        hex: '3c65a4',
        flight: 'DLH400',
        registration: 'D-AIMD',
        type: 'A388',
        description: 'Airbus A380-841',
        altitude: 38000,
        speed: 490,
        heading: 270,
        distanceKm: 4.2,
        lat: 50.0379,
        lon: 8.5622,
        category: 'A5'
      },
      {
        hex: 'a15397',
        flight: 'DAL405',
        registration: 'N185DN',
        type: 'B763',
        description: 'Boeing 767-332ER',
        altitude: 12000,
        speed: 320,
        heading: 90,
        distanceKm: 8.7,
        lat: 40.6413,
        lon: -73.7781,
        category: 'A5'
      },
      {
        hex: '406a05',
        flight: 'BAW207',
        registration: 'G-XLEF',
        type: 'A388',
        description: 'Airbus A380-841',
        altitude: 35000,
        speed: 485,
        heading: 120,
        distanceKm: 12.4,
        lat: 51.4700,
        lon: -0.4543,
        category: 'A5'
      }
    ];
    setAircrafts(DUMMY_AIRCRAFTS);
    setVisibleCount(5);
    setLastUpdated(new Date());
    setFetchError(null);
    setIsManualMode(true);
    setCustomLocationName('Demo Mode (Test Flights)');
    // Set mock coordinates to avoid errors in lazy loading distance calculation
    setCoords({ lat: 50.0, lon: 8.0 });
    setPermission('granted');
  };

  return (
    <div className="container">
      <Header theme={theme} setTheme={setTheme} />

      <main className="main-content">
        {permission === 'checking' && (
          <div className="card status-card loading-state font-mono">
            <div className="spinner"></div>
            <p className="loading-dots">Initializing Satellite Links</p>
          </div>
        )}

        {(permission === 'prompt' || permission === 'denied' || permission === 'unsupported') && (
          <SearchCard
            permission={permission}
            locationError={locationError}
            requestLocation={requestLocation}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchLoading={searchLoading}
            searchError={searchError}
            handleSearch={handleSearch}
            selectPreset={selectPreset}
            loadTestFlights={loadTestFlights}
            presetAirports={PRESET_AIRPORTS}
          />
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
            <ControlPanel
              radiusKm={radiusKm}
              handleRadiusChange={handleRadiusChange}
              cooldown={cooldown}
              loading={loading}
              handleManualRefresh={handleManualRefresh}
              autoRefresh={autoRefresh}
              setAutoRefresh={setAutoRefresh}
              lastUpdated={lastUpdated}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchLoading={searchLoading}
              searchError={searchError}
              handleSearch={handleSearch}
              selectPreset={selectPreset}
              loadTestFlights={loadTestFlights}
              presetAirports={PRESET_AIRPORTS}
            />

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
              <div className="card empty-card font-mono" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty-illustration">📡</div>
                <h3>No Flight Traffic Detected</h3>
                <p>No active transponders matched vector criteria within {radiusKm}KM radius.</p>
                <p className="empty-tip">Tip: Increase scan range slider or trigger preset airport zones (e.g. JFK or LHR) to verify feed parsing.</p>
                <button
                  onClick={loadTestFlights}
                  className="primary-btn font-mono"
                  style={{ marginTop: '1.5rem', width: 'auto', display: 'inline-flex', padding: '0.8rem 1.6rem' }}
                >
                  🧪 Run POC (Load Test Flights)
                </button>
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

      <Footer />
    </div>
  );
}
