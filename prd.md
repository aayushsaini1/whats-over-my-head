# What's Over My Head — Technical PRD

**Doc type:** Technical PRD (build spec)
**Target build tool:** Antigravity
**Author:** Aayush
**Status:** Draft v1

---

## 1. One-line summary

A web app that uses the user's location to detect and display live aircraft currently flying overhead or nearby, showing flight identity, aircraft type, and flight metrics.

## 2. Problem / motivation

Someone looks up, sees a plane, and has no easy way to know what it is, where it's from, or where it's going. This app closes that loop in under 3 seconds: open app → grant location → see the plane(s) above you.

## 3. Goals

- Get user location automatically.
- Query live aircraft within a configurable radius of that location.
- Display flight number/callsign, airline (if resolvable), aircraft type, altitude, speed, heading, and distance from user.
- Zero cost to run and zero cost to the user. No paid API tiers.
- Fast: location → results in under 3 seconds on a decent connection.

## 4. Non-goals (v1)

- No historical flight tracking or route playback.
- No push notifications for "a plane is now overhead."
- No AR camera overlay (plane-pointing-through-camera) — candidate for v2.
- No user accounts, saved locations, or history.
- No native mobile app — web app / PWA only.

## 5. Users

Single-user, casual/curiosity use case. No roles, no auth.

## 6. Core user flow

1. User opens the app.
2. App requests browser geolocation permission.
3. On grant: app captures `{lat, lon}`.
4. App queries the flight data API for aircraft within a radius (default suggestion below) of that point.
5. App renders a list/card view of aircraft found, nearest first, with a manual refresh and an auto-refresh interval.
6. If zero aircraft found: show an explicit empty state, not a blank screen.
7. If geolocation is denied: fall back to manual lat/lon or city-name entry.

## 7. System architecture

```
[Browser: Geolocation API]
        |
        v
[Frontend app] --HTTP GET--> [ADS-B aggregator API] --> aircraft JSON
        |
        v
[Render aircraft cards / list]
```

**Recommended architecture: thin frontend + lightweight backend proxy**, not pure client-side fetch. Reasons in Section 9 (API notes) — CORS and rate-limit handling are safer server-side, and it lets you cache/dedupe requests if multiple users hit the app.

- **Frontend:** Single-page app. Framework-agnostic; React or plain JS both fine for Antigravity to scaffold.
- **Backend:** One lightweight serverless function or small Node/Express route that:
  - Accepts `{lat, lon, radius}` from frontend.
  - Calls the ADS-B API server-side (avoids browser CORS issues, hides nothing sensitive since these APIs are keyless, but centralizes rate limiting).
  - Returns normalized JSON to frontend.
- **No database required for v1.** Everything is live/ephemeral.

## 8. Data source — flight/aircraft API

Use a **free, keyless ADS-B aggregator API**. These aggregate live transponder data from volunteer ground receivers.

### Primary candidate: adsb.lol
- Endpoint pattern: `GET https://api.adsb.lol/v2/point/{lat}/{lon}/{radius_nm}`
- No API key, no signup, community-run (ODbL 1.0 license).
- Radius parameter is in **nautical miles**, max 250 NM.
- Returns per-aircraft: callsign/flight, registration, ICAO 24-bit hex, aircraft type designator (e.g. `B738`), type description, altitude (barometric + geometric), ground speed, track/heading, vertical rate, squawk, category, lat/lon, and signal age.

### Fallback candidate: adsb.fi
- Endpoint pattern: `GET https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{dist_nm}`
- Same model: free, no key, ADS-B Exchange–compatible response schema.
- Rate limited to ~1 request/second per IP on public endpoints.

**Build recommendation:** implement an adapter interface (`getNearbyAircraft(lat, lon, radiusKm)`) with adsb.lol as primary and adsb.fi as automatic fallback if the primary fails or times out. Both return similar enough shapes that a thin normalizer layer can unify them.

### Aircraft type resolution
No separate lookup needed — both APIs return aircraft type designator and description directly in the aircraft record. (This is why adsb.lol/adsb.fi are preferred over raw OpenSky, which requires a second database join for type.)

### Units / conversion note for the builder
- App-facing radius should be in **km** (per product spec: default 2km). Convert to NM before calling the API: `radius_nm = radius_km / 1.852`.
- 2km (~1.08 NM) is a very tight radius. At that radius, empty results will be common, especially in areas with sparse volunteer receiver coverage or when no aircraft happen to be transiting at that moment. **Radius must be a user-adjustable setting**, not hardcoded — suggest a slider from 1–20km, defaulting to 5km, with 2km available as the tightest setting.

## 9. API integration notes / open risks

- **CORS:** Not fully confirmed whether adsb.lol/adsb.fi allow direct browser-side calls. Build the backend proxy regardless (Section 7) so this is a non-issue — proxy calls the API server-to-server.
- **Rate limits:** Both APIs are community-run and dynamically rate-limited. Backend proxy should implement basic throttling/backoff (e.g. don't allow the frontend to poll faster than every 10–15 seconds) to avoid getting IP-throttled.
- **Data freshness:** Live snapshot only — aircraft positions/altitudes reflect the moment of the query. Two calls a few seconds apart can return different aircraft sets. This is expected, not a bug.
- **Coverage gaps:** Data depends entirely on volunteer ADS-B receivers near the user. Dense in cities/near airports, sparse in rural areas. Empty state copy should account for this ("no aircraft detected in range" rather than implying the tracker itself failed).
- **No guaranteed SLA:** These are free community services, not commercial APIs. No uptime guarantee. Acceptable for this project's scope; not suitable if this were ever monetized/scaled.

## 10. Functional requirements

| ID | Requirement |
|---|---|
| FR1 | App requests browser geolocation on load; handles grant, denial, and unsupported-browser cases distinctly. |
| FR2 | On denial/unsupported, app offers manual lat/lon or place-name entry as fallback. |
| FR3 | App converts location + radius into an API call and fetches nearby aircraft. |
| FR4 | Results are sorted by distance from user, nearest first. |
| FR5 | Each result card shows: callsign/flight number, aircraft type + description, altitude, ground speed, heading, distance from user. Show "—" or "unknown" for any field the API returns empty, don't fake it. |
| FR6 | Empty state is explicit and explains likely cause (no traffic in range / sparse local coverage), with a suggestion to increase radius. |
| FR7 | Radius is user-adjustable (1–20km slider or stepper), default 5km. |
| FR8 | Auto-refresh on a fixed interval (suggest 15s) plus a manual refresh control. |
| FR9 | Loading and error states are distinct from the empty state (network failure ≠ zero aircraft). |
| FR10 | If primary API fails, silently fall back to secondary API before surfacing an error to the user. |

## 11. Non-functional requirements

- **Cost:** $0 to run at low/personal traffic. Both data sources are free/keyless; hosting should use a free tier (e.g. Vercel/Netlify functions for the proxy).
- **Performance:** Initial result render within 3 seconds of location grant on a typical mobile connection.
- **Responsiveness:** Mobile-first — this is a "look up, check phone" use case.
- **Privacy:** Location data is used transiently for the API call only; never stored, never logged with PII, no analytics tracking location history.
- **Offline/permission handling:** Must degrade gracefully, never show a blank white screen.

## 12. Out of scope / v2 ideas (parking lot)

- AR camera view: point phone at sky, overlay nearest aircraft info on camera feed using device compass/gyroscope + aircraft bearing.
- Push notification when a "notable" aircraft (e.g. rare aircraft type, military, VIP) is nearby.
- Historical playback of a specific aircraft's path.
- PWA install prompt + offline shell caching.

## 13. Suggested tech stack (non-binding, for Antigravity to adapt)

- Frontend: React + Vite (or plain HTML/JS if kept minimal), Tailwind for styling.
- Backend: Single serverless function (Vercel/Netlify) or minimal Express server acting as the ADS-B proxy.
- No database, no auth, no external state.
- Deployment target: free-tier static hosting + serverless function.

## 14. Acceptance criteria (v1 done-definition)

- [ ] User can load the app, grant location, and see a live list of nearby aircraft within 3 seconds.
- [ ] Each aircraft card shows type, callsign, altitude, speed, heading, distance.
- [ ] Radius is adjustable and persists for the session.
- [ ] Empty, loading, and error states are visually distinct and each has clear copy.
- [ ] Fallback to secondary API works when primary fails (test by temporarily blocking primary endpoint).
- [ ] Fully usable on mobile viewport.
- [ ] No API keys, no paid services, no user data stored server-side.