export interface Aircraft {
  hex: string;
  flight: string;
  registration: string;
  type: string;
  description: string;
  altitude: number | string | null;
  speed: number | null;
  heading: number | null;
  distanceKm: number | null;
  lat: number | null;
  lon: number | null;
  category: string;
}

export type PermissionState = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface PresetAirport {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export interface LazyRouteInfo {
  origin: {
    iata: string;
    icao: string;
    name: string;
    country: string;
  } | null;
  destination: {
    iata: string;
    icao: string;
    name: string;
    country: string;
  } | null;
  airlineIata: string | null;
}

export interface LazyAircraftInfo {
  manufacturer: string | null;
  modelName: string | null;
  icaoType: string | null;
  owner: string | null;
  photoUrl: string | null;
  photoThumbUrl: string | null;
}

export type ThemeType = 'default' | 'dark-blue' | 'pink' | 'light-blue';
