import React, { useState, useEffect } from 'react';
import { Aircraft, LazyRouteInfo, LazyAircraftInfo } from '../app/types';

interface FlightCardProps {
  ac: Aircraft;
  userCoords: { lat: number; lon: number };
}

export default function FlightCard({ ac, userCoords }: FlightCardProps) {
  const [routeInfo, setRouteInfo] = useState<LazyRouteInfo | null>(null);
  const [aircraftInfo, setAircraftInfo] = useState<LazyAircraftInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState<boolean>(false);

  // Extract airline code from callsign (DLH123 -> DLH, AA23 -> AA)
  const getAirlineCode = (flight: string) => {
    const cleanFlight = flight.trim().replace(/[^a-zA-Z0-9]/g, '');
    const match = cleanFlight.match(/^([A-Za-z]{2,3})/);
    return match ? match[1].toUpperCase() : null;
  };

  const airlineCode = getAirlineCode(ac.flight);

  // Logo loading and fallbacks
  useEffect(() => {
    if (airlineCode) {
      setLogoFailed(false);
      setLogoLoaded(false);
      if (airlineCode.length === 3) {
        setLogoUrl(`https://raw.githubusercontent.com/sexym0nk3y/airline-logos/master/logos/${airlineCode.toUpperCase()}.png`);
      } else if (airlineCode.length === 2) {
        setLogoUrl(`https://airlabs.co/img/airline/m/${airlineCode.toUpperCase()}.png`);
      }
    }
  }, [airlineCode]);

  useEffect(() => {
    if (routeInfo?.airlineIata && !logoLoaded) {
      setLogoFailed(false);
      setLogoUrl(`https://images.daisycon.io/airline/?width=100&height=50&color=ffffff&iata=${routeInfo.airlineIata.toLowerCase()}`);
    }
  }, [routeInfo, logoLoaded]);

  const handleLogoError = () => {
    if (logoUrl) {
      if (logoUrl.includes('sexym0nk3y')) {
        // Fallback: try Daisycon with parsed 3-letter ICAO mapped to IATA or just wait for routeInfo
        if (routeInfo?.airlineIata) {
          setLogoUrl(`https://images.daisycon.io/airline/?width=100&height=50&color=ffffff&iata=${routeInfo.airlineIata.toLowerCase()}`);
        } else if (airlineCode && airlineCode.length === 3) {
          setLogoUrl(`https://airlabs.co/img/airline/m/${airlineCode.toUpperCase()}.png`);
        } else {
          setLogoUrl(null);
          setLogoFailed(true);
        }
      } else if (logoUrl.includes('airlabs.co')) {
        // Try Daisycon
        const code = routeInfo?.airlineIata || (airlineCode && airlineCode.length === 2 ? airlineCode : null);
        if (code) {
          setLogoUrl(`https://images.daisycon.io/airline/?width=100&height=50&color=ffffff&iata=${code.toLowerCase()}`);
        } else {
          setLogoUrl(null);
          setLogoFailed(true);
        }
      } else {
        setLogoUrl(null);
        setLogoFailed(true);
      }
    } else {
      setLogoFailed(true);
    }
  };

  // Fetch extra aircraft/route details lazily on mount
  useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      try {
        setLoading(true);
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
          {/* Airline Logo with 4 corner anchors */}
          {logoUrl && !logoFailed && (
            <div className="airline-logo-wrapper">
              <span className="corner-plus top-left">+</span>
              <span className="corner-plus top-right">+</span>
              <span className="corner-plus bottom-left">+</span>
              <span className="corner-plus bottom-right">+</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={`${airlineCode || 'Airline'} logo`}
                className="airline-logo"
                onLoad={() => setLogoLoaded(true)}
                onError={handleLogoError}
                loading="lazy"
              />
            </div>
          )}
          <div className="flight-identity">
            <span className="flight-callsign">{ac.flight !== '—' ? ac.flight : 'Unknown'}</span>
          </div>
        </div>
        
        <div className="header-right-side" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {/* Route [SRC -> DST] */}
          <span className="header-route font-mono" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            {loading ? (
              '[Resolving...]'
            ) : routeInfo?.origin && routeInfo?.destination ? (
              `[${routeInfo.origin.iata || routeInfo.origin.icao || '???'} ➔ ${routeInfo.destination?.iata || routeInfo.destination?.icao || '???'}]`
            ) : (
              '[No Schedule]'
            )}
          </span>
          
          <div className="flight-distance">
            {ac.distanceKm !== null ? `${ac.distanceKm} KM` : 'DIST UNKNOWN'}
          </div>
        </div>
      </div>

      <div className="flight-card-body">
        {/* Technical Data Grid */}
        <div className="tech-telemetry-grid">
          <div className="tech-row-horizontal">
            <div className="tech-col">
              <span className="tech-label">PLANE</span>
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
          </div>

          <div className="tech-row-horizontal">
            <div className="tech-col">
              <span className="tech-label">ALTITUDE</span>
              <span className="tech-value font-mono text-green">
                {ac.altitude === 'ground' ? 'Ground' : ac.altitude !== null ? `${ac.altitude.toLocaleString()} FT` : '—'}
              </span>
            </div>
            <div className="tech-col">
              <span className="tech-label">SPEED</span>
              <span className="tech-value font-mono text-green">
                {ac.speed !== null ? `${ac.speed} KTS` : '—'}
                <span className="sub-metric">{ac.speed !== null && ` (${knotsToKmh(ac.speed)})`}</span>
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
