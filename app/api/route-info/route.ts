import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple in-memory cache to prevent duplicate external lookups during runtime
const routeCache = new Map<string, any>();
const aircraftCache = new Map<string, any>();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const callsign = searchParams.get('callsign')?.trim().toUpperCase();
  const hex = searchParams.get('hex')?.trim().toLowerCase();

  if (!callsign && !hex) {
    return NextResponse.json({ error: 'Missing callsign or hex' }, { status: 400 });
  }

  let routeData = null;
  let aircraftData = null;

  // 1. Fetch Route Info (using Callsign)
  if (callsign && callsign !== '—' && callsign !== '') {
    if (routeCache.has(callsign)) {
      routeData = routeCache.get(callsign);
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const res = await fetch(`https://api.adsbdb.com/v0/callsign/${callsign}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json', 'User-Agent': 'WhatsOverMyHeadApp/1.0' },
          next: { revalidate: 3600 } // Cache in Next for 1 hour
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const body = await res.json();
          if (body && body.response && body.response.flightroute) {
            const fr = body.response.flightroute;
            routeData = {
              callsign: fr.callsign,
              airlineName: fr.airline?.name || null,
              airlineIcao: fr.airline?.icao || null,
              origin: fr.origin ? {
                icao: fr.origin.icao_code || null,
                iata: fr.origin.iata_code || null,
                name: fr.origin.name || null,
                country: fr.origin.country_name || null,
              } : null,
              destination: fr.destination ? {
                icao: fr.destination.icao_code || null,
                iata: fr.destination.iata_code || null,
                name: fr.destination.name || null,
                country: fr.destination.country_name || null,
              } : null
            };
            routeCache.set(callsign, routeData);
          }
        }
      } catch (err) {
        console.error(`Route lookup failed for callsign ${callsign}:`, err);
      }
    }
  }

  // 2. Fetch Aircraft Info (using ICAO Hex)
  if (hex && hex !== 'unknown' && hex !== '') {
    if (aircraftCache.has(hex)) {
      aircraftData = aircraftCache.get(hex);
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const res = await fetch(`https://api.adsbdb.com/v0/aircraft/${hex}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json', 'User-Agent': 'WhatsOverMyHeadApp/1.0' },
          next: { revalidate: 3600 } // Cache in Next for 1 hour
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const body = await res.json();
          if (body && body.response && body.response.aircraft) {
            const ac = body.response.aircraft;
            aircraftData = {
              manufacturer: ac.manufacturer || null,
              modelName: ac.type || null,
              icaoType: ac.icao_type || null,
              owner: ac.registered_owner || null,
              photoUrl: ac.url_photo || null,
              photoThumbUrl: ac.url_photo_thumbnail || null
            };
            aircraftCache.set(hex, aircraftData);
          }
        }
      } catch (err) {
        console.error(`Aircraft lookup failed for hex ${hex}:`, err);
      }
    }
  }

  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
  };

  return NextResponse.json(
    {
      route: routeData,
      aircraft: aircraftData,
      timestamp: Date.now()
    },
    {
      status: 200,
      headers: responseHeaders
    }
  );
}
