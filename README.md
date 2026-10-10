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

The deployable UI lives in `frontend/`. It includes client registration and sign-in, the private chart vault, admin access and the consultation inbox. Configure the Vercel project root as `frontend` and set `VITE_API_BASE_URL` to the public Render backend URL. Keep the Render service using `backend/Dockerfile`.

Set `ADMIN_PASSKEY` in Render to enable the Astrologer Admin sign-in. Client accounts and saved charts are stored as JSON below `CELESTIA_DATA_DIR` (defaults to `./data`); attach a Render persistent disk and point this variable at its mount path if this data must survive service redeploys.

## Ask Your Chart

Questions use chart-based rules rather than canned replies. Recognized topics in a typed question override the previous topic selection; the selector remains a fallback for ambiguous questions. Career questions distinguish income, job transitions, promotion, business and suitable fields, using relevant houses for timing. Questions about qualities or practices focus on guidance instead of repeating event-date panels. Different wording of the same intent can legitimately produce the same chart indications.

Run the question-intent and chart-assessment regressions with `node scripts/ask-assessment-regression.mjs` from `frontend/`.

## Place search

Birthplaces are searched through the free [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api), which returns coordinates and an IANA timezone with no API key. Celestia skips any result without a timezone and never guesses one.

To use a different Open-Meteo-compatible endpoint, set `CELESTIA_GEOCODER_URL`. Review the provider's terms and attribution requirements before production use.

## API

- `GET /api/places?q=<text>` returns `[{placeName, latitude, longitude, timeZone}]`.
- `POST /api/chart` with `{name?, date, time, placeName, latitude, longitude, timeZone, ayanamsa}` returns the chart.
- Errors are always `{"error": "message"}`.
