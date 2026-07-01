import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AircraftData {
  hex: string;
  flight?: string;
  r?: string; // registration
  t?: string; // type
  desc?: string; // description
  alt_baro?: number; // altitude in feet
  alt_geom?: number;
  gs?: number; // speed in knots
  track?: number; // track heading in degrees
  lat?: number;
  lon?: number;
  category?: string;
}

// Great-Circle distance formula (Haversine)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  const radiusKmStr = searchParams.get('radiusKm');

  if (!latStr || !lonStr || !radiusKmStr) {
    return NextResponse.json(
      { error: 'Missing required parameters: lat, lon, radiusKm' },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const radiusKm = parseFloat(radiusKmStr);

  if (isNaN(lat) || isNaN(lon) || isNaN(radiusKm)) {
    return NextResponse.json(
      { error: 'Invalid numeric parameters: lat, lon, radiusKm must be numbers' },
      { status: 400 }
    );
  }

  // Convert radius in Km to Nautical Miles (1 NM = 1.852 km)
  const radiusNm = radiusKm / 1.852;
  // Cap at 250 NM per API guidelines
  const cappedRadiusNm = Math.min(radiusNm, 250);

  // Define API URLs
  const primaryUrl = `https://api.adsb.lol/v2/point/${lat}/${lon}/${cappedRadiusNm}`;
  const fallbackUrl = `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${cappedRadiusNm}`;

  let data: { ac?: AircraftData[] } | null = null;
  let usedFallback = false;
  let errorMessage = '';

  // Try primary API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for primary

    const response = await fetch(primaryUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WhatsOverMyHeadApp/1.0',
      },
      next: { revalidate: 10 } // Next.js cache for 10 seconds
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      data = await response.json();
    } else {
      throw new Error(`Primary API responded with status ${response.status}`);
    }
  } catch (err: any) {
    console.error('Primary ADS-B API failed. Trying fallback. Error:', err.message || err);
    errorMessage = err.message || String(err);
    usedFallback = true;
  }

  // If primary failed or returned empty results/no data, try fallback
  if (!data || !data.ac) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for fallback

      const response = await fetch(fallbackUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WhatsOverMyHeadApp/1.0',
        },
        next: { revalidate: 10 }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        data = await response.json();
      } else {
        throw new Error(`Fallback API responded with status ${response.status}`);
      }
    } catch (err: any) {
      console.error('Fallback ADS-B API also failed. Error:', err.message || err);
      return NextResponse.json(
        {
          error: 'Failed to retrieve flight data from both primary and fallback sources.',
          details: err.message || String(err),
          primaryError: errorMessage
        },
        { status: 502 }
      );
    }
  }

  // Parse and normalize aircraft data
  const aircraftList = data?.ac || [];
  const normalizedAircraft = aircraftList
    .map((ac) => {
      // Calculate real-time distance from user location
      let distanceKm: number | null = null;
      if (ac.lat !== undefined && ac.lon !== undefined && ac.lat !== null && ac.lon !== null) {
        distanceKm = getDistanceKm(lat, lon, ac.lat, ac.lon);
      }

      // We normalize fields and clean flight string
      return {
        hex: ac.hex || 'unknown',
        flight: ac.flight ? ac.flight.trim() : '—',
        registration: ac.r ? ac.r.trim() : '—',
        type: ac.t || '—',
        description: ac.desc || '—',
        altitude: ac.alt_baro !== undefined ? ac.alt_baro : (ac.alt_geom !== undefined ? ac.alt_geom : null),
        speed: ac.gs !== undefined ? ac.gs : null,
        heading: ac.track !== undefined ? ac.track : null,
        distanceKm: distanceKm !== null ? parseFloat(distanceKm.toFixed(2)) : null,
        lat: ac.lat || null,
        lon: ac.lon || null,
        category: ac.category || '—'
      };
    })
    // Filter out aircraft outside our requested radius in km (the API is in NM and can sometimes return extra edge items)
    .filter((ac) => ac.distanceKm !== null && ac.distanceKm <= radiusKm)
    // Sort by distance (nearest first)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5',
  };

  return NextResponse.json(
    {
      aircraft: normalizedAircraft,
      count: normalizedAircraft.length,
      fallbackUsed: usedFallback,
      timestamp: Date.now()
    },
    {
      status: 200,
      headers: responseHeaders
    }
  );
}
