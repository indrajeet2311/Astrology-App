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

### PostgreSQL persistence (optional)

The default `CELESTIA_STORAGE=file` retains local JSON storage. For external PostgreSQL (for example Neon), set these **backend-only** environment variables:

```text
CELESTIA_STORAGE=postgres
CELESTIA_DATABASE_URL=jdbc:postgresql://YOUR_HOST/YOUR_DATABASE?sslmode=require
CELESTIA_DATABASE_USERNAME=YOUR_DATABASE_USER
CELESTIA_DATABASE_PASSWORD=YOUR_DATABASE_PASSWORD
```

Never put database credentials in Git, Vercel frontend variables, or `VITE_*` variables. Database mode fails on connection/storage errors; it does not fall back to ephemeral files. The app creates `celestia_user_documents` and stores the four existing JSON documents in PostgreSQL to preserve API behavior, IDs and password hashes. Read/modify/write flows run in transactions with a shared PostgreSQL advisory lock, including across backend instances. This document-oriented storage is intended for the current small app, not high-volume workloads.

**Migration must happen before redeploying the old ephemeral service.** Obtain a consistent, private backup of all four files (`users.json`, `sessions.json`, `user_charts.json`, `consultations.json`) while writes are stopped. Render Free has no Shell/SSH; do not assume a redeploy can recover those files. Do not switch production until the backup is available.

To import a backup into an empty database, make the backup directory available to the backend and set `CELESTIA_IMPORT_DIR` to that path for the first startup. Import validates all four document shapes and commits atomically; it refuses to overwrite nonempty database documents. Remove `CELESTIA_IMPORT_DIR` after a successful import and securely remove temporary backup copies. Verify existing login, chart ownership and consultation records before reopening writes. Keep the original backup for recovery; never enable both file and database backends for production writes.

`mvn test` covers file-mode persistence and delivery. To also run real PostgreSQL migration/persistence tests, set `CELESTIA_TEST_DATABASE_URL` (JDBC URL), `CELESTIA_TEST_DATABASE_USERNAME`, and `CELESTIA_TEST_DATABASE_PASSWORD` for a test database where the user can create/drop schemas. Tests isolate each run in a random schema and remove only that schema. Without those variables, PostgreSQL integration tests are explicitly skipped; passing file-mode tests does not certify PostgreSQL deployment.

Consultation requests are emailed through the Google Apps Script web app configured by `GOOGLE_APPS_SCRIPT_URL`. If the web app checks a shared secret, also set its matching `GOOGLE_APPS_SCRIPT_TOKEN`; the token is optional for deployments that do not require one. The backend follows the Apps Script result redirect and requires a JSON `{"status":"success"}` acknowledgment before saving the request and reporting it as sent. Unconfigured delivery, HTTP failures, and unsuccessful acknowledgments return an error. A successful acknowledgment confirms webhook acceptance, not final mailbox delivery.

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
