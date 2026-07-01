import React from 'react';
import { PresetAirport } from '../app/types';

interface ControlPanelProps {
  radiusKm: number;
  handleRadiusChange: (radius: number) => void;
  cooldown: number;
  loading: boolean;
  handleManualRefresh: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (checked: boolean) => void;
  lastUpdated: Date | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  handleSearch: (e?: React.FormEvent) => void;
  selectPreset: (airport: PresetAirport) => void;
  loadTestFlights: () => void;
  presetAirports: PresetAirport[];
}

export default function ControlPanel({
  radiusKm,
  handleRadiusChange,
  cooldown,
  loading,
  handleManualRefresh,
  autoRefresh,
  setAutoRefresh,
  lastUpdated,
  searchQuery,
  setSearchQuery,
  searchLoading,
  searchError,
  handleSearch,
  selectPreset,
  loadTestFlights,
  presetAirports
}: ControlPanelProps) {
  return (
    <div className="card control-panel font-mono">
      {/* Manual search inside dashboard */}
      <div className="dashboard-search-block" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <form onSubmit={handleSearch} className="search-form compact-search" style={{ width: '100%' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city or 'lat, lon'"
            className="search-input font-mono"
            disabled={searchLoading}
          />
          <button type="submit" className="search-btn font-mono" disabled={searchLoading}>
            {searchLoading ? <span className="mini-spinner"></span> : 'Search'}
          </button>
        </form>
        
        {/* Presets below search inside dashboard */}
        <div className="dashboard-presets-row" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>high traffic airports:</span>
          <div className="dashboard-presets" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {presetAirports.map((airport) => (
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
            'Scan Sky Now'
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
  );
}
