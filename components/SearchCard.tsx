import React from 'react';
import { PermissionState, PresetAirport } from '../app/types';

interface SearchCardProps {
  permission: PermissionState;
  locationError: string | null;
  requestLocation: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  handleSearch: (e?: React.FormEvent) => void;
  selectPreset: (airport: PresetAirport) => void;
  loadTestFlights: () => void;
  presetAirports: PresetAirport[];
}

export default function SearchCard({
  permission,
  locationError,
  requestLocation,
  searchQuery,
  setSearchQuery,
  searchLoading,
  searchError,
  handleSearch,
  selectPreset,
  loadTestFlights,
  presetAirports
}: SearchCardProps) {
  return (
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
          {searchLoading ? <span className="mini-spinner"></span> : 'Search'}
        </button>
      </form>
      {searchError && <p className="search-error font-mono">{searchError}</p>}

      {/* Presets */}
      <div className="presets-section">
        <p className="presets-title">high traffic airports:</p>
        <div className="preset-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {presetAirports.map((airport) => (
            <button
              key={airport.code}
              onClick={() => selectPreset(airport)}
              className="preset-badge-btn font-mono"
            >
              {airport.code} ({airport.name.split(' ')[0]})
            </button>
          ))}
          <button
            onClick={loadTestFlights}
            className="preset-badge-btn font-mono"
            style={{ background: 'rgba(16, 185, 129, 0.25)', borderColor: 'var(--accent-green)', color: 'var(--text-primary)', fontWeight: 'bold' }}
          >
            🧪 Run POC (Demo Data)
          </button>
        </div>
      </div>
    </div>
  );
}
