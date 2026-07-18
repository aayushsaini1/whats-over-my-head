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
    <article className="flight-card">
      {/* Left side: Photo or placeholder */}
      <div className="flight-photo-container">
        {!photoFailed && aircraftInfo?.photoUrl ? (
          <img
            src={aircraftInfo.photoUrl}
            alt={`${aircraftInfo.manufacturer || ''} ${aircraftInfo.modelName || ''}`}
            className="flight-photo"
            onError={() => setPhotoFailed(true)}
            loading="lazy"
          />
        ) : (
          <div className="flight-photo-placeholder">
            <svg className="icon-plane-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V14L13 9V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" />
            </svg>
          </div>
        )}
        {/* <div className="live-badge">
          <span className="live-dot"></span>
          LIVE
        </div> */}
      </div>

      {/* Right side: Information */}
      <div className="flight-details-container">
        {/* Top Header Row */}
        <div className="flight-header-row">
          <div className="flight-identity-group">
            {logoUrl && !logoFailed ? (
              <div className="airline-logo-box">
                <img
                  src={logoUrl}
                  alt={`${airlineCode || 'Airline'} logo`}
                  className="airline-logo-img"
                  onLoad={() => setLogoLoaded(true)}
                  onError={handleLogoError}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="airline-logo-box-placeholder">
                {airlineCode || '??'}
              </div>
            )}
            <span className="flight-callsign-text">{ac.flight !== '—' ? ac.flight : 'Unknown'}</span>
          </div>

          <div className="flight-route-container">
            {loading ? (
              <span className="flight-route-badge loading-route">... ➔ ...</span>
            ) : routeInfo?.origin && routeInfo?.destination ? (
              <span className="flight-route-badge">
                {routeInfo.origin.iata || routeInfo.origin.icao || '???'} ➔ {routeInfo.destination?.iata || routeInfo.destination?.icao || '???'}
              </span>
            ) : (
              <span className="flight-route-badge no-schedule">No Route</span>
            )}

            <div className="flight-distance-badge">
              <svg className="icon-location" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{ac.distanceKm !== null ? `${ac.distanceKm.toFixed(2)} km away` : 'Dist Unknown'}</span>
            </div>
          </div>

          {/* <div className="flight-action-chevron">
            <svg className="icon-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div> */}
        </div>

        {/* Stats Grid */}
        <div className="flight-stats-grid">
          <div className="flight-stat-col">
            <span className="stat-label">AIRCRAFT</span>
            <span className="stat-value">
              {loading ? (
                'Resolving...'
              ) : aircraftInfo?.manufacturer ? (
                `${aircraftInfo.manufacturer} ${aircraftInfo.modelName || aircraftInfo.icaoType || ''}`
              ) : ac.type !== '—' ? (
                ac.type
              ) : (
                'Unknown Model'
              )}
            </span>
          </div>

          <div className="flight-stat-col">
            <span className="stat-label">ALTITUDE</span>
            <span className="stat-value altitude-value">
              <svg className="icon-altitude" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
              </svg>
              {ac.altitude === 'ground' ? 'Ground' : ac.altitude !== null ? `${ac.altitude.toLocaleString()} ft` : '—'}
            </span>
          </div>

          <div className="flight-stat-col">
            <span className="stat-label">SPEED</span>
            <span className="stat-value speed-value">
              <svg className="icon-speed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 14 4-4" />
                <path d="M3.34 19a10 10 0 1 1 17.32 0" />
              </svg>
              <span>
                {ac.speed !== null ? `${ac.speed} KTS` : '—'}
                {ac.speed !== null && <span className="stat-sub-value"> ({knotsToKmh(ac.speed)})</span>}
              </span>
            </span>
          </div>
        </div>

        <div className="flight-card-divider"></div>

        {/* Footer Details */}
        <div className="flight-footer-row">
          <div className="flight-footer-col">
            <span className="footer-label">OPERATOR</span>
            <span className="footer-value">
              {aircraftInfo?.owner || ac.flight !== '—' && airlineCode ? `${airlineCode} Operator` : '—'}
            </span>
          </div>
          <div className="flight-footer-col">
            <span className="footer-label">DEPARTURE</span>
            <span className="footer-value">
              {loading ? (
                '...'
              ) : routeInfo?.origin ? (
                `${routeInfo.origin.iata || routeInfo.origin.icao} - ${routeInfo.origin.name}`
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="flight-footer-col">
            <span className="footer-label">ARRIVAL</span>
            <span className="footer-value">
              {loading ? (
                '...'
              ) : routeInfo?.destination ? (
                `${routeInfo.destination.iata || routeInfo.destination.icao} - ${routeInfo.destination.name}`
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
