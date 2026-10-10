# Celestia

A small Vedic astrology web app using React + TypeScript + Vite on the frontend and Spring Boot + Maven on the backend.

## Calculation engine

Charts and planetary coordinates are computed directly via high-precision astronomical algorithms. Supported ayanamsas include Lahiri, Raman, and Krishnamurti with whole-sign and equal house systems. Lunar nodes (mean and true) are accurately calculated. Birth years 1800–2100 are supported with automatic IANA timezone conversion and daylight saving boundary handling.

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
