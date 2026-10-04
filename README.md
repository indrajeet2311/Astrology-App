# Celestia

A small Vedic astrology web app using React + TypeScript + Vite on the frontend and Spring Boot + Maven on the backend.

## Calculation engine

Charts are computed with Thomas Mack's Java port of the Swiss Ephemeris (`de.thmac.swisseph`), using the built-in Moshier mode, so no ephemeris data files are needed. The adapter is isolated in `SwissEphemerisCalculator`. Swiss Ephemeris is AGPL-licensed; review its licensing terms before commercial or closed-source deployment.

Supported ayanamsas: Lahiri, Raman, Krishnamurti. Rahu is the mean node; Ketu is exactly opposite. Houses are whole-sign. Birth years 1800-2100 are accepted. A local time that does not exist because of a daylight-saving jump is rejected; for a repeated hour the earlier (daylight) offset is used.

## Run

### Backend

Requires Java 17+ and Maven. The Swiss Ephemeris dependency is fetched from JitPack.

```bash
cd backend
mvn test
mvn spring-boot:run
```

### Frontend

Requires Node 16+.

```bash
cd frontend
npm install
npm run build
npm run dev
```

The Vite dev server (http://localhost:5173) proxies `/api` to `http://localhost:8080`, so start the backend first.

## Place search

Birthplaces are searched through the free [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api), which returns coordinates and an IANA timezone with no API key. Celestia skips any result without a timezone and never guesses one.

To use a different Open-Meteo-compatible endpoint, set `CELESTIA_GEOCODER_URL`. Review the provider's terms and attribution requirements before production use.

## API

- `GET /api/places?q=<text>` returns `[{placeName, latitude, longitude, timeZone}]`.
- `POST /api/chart` with `{name?, date, time, placeName, latitude, longitude, timeZone, ayanamsa}` returns the chart.
- Errors are always `{"error": "message"}`.
