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

Questions use chart-based rules rather than canned replies. Recognized topics in a typed question override the previous topic selection; the selector remains a fallback for ambiguous questions. Marriage readings use D1 with Navamsa (D9), career readings use D1 with Dasamsa (D10), and children/parenting readings use D1 with Saptamsa (D7). Source-qualified timing uses topic-specific Vimshottari checks and Chara marriage conditions; it does not reuse legacy heuristic dates or fetch transits for Ask. Career questions distinguish income, job transitions, promotion, business and suitable fields. Questions about qualities or practices omit event-date panels. Different wording of the same intent can legitimately produce the same matched indications. These are traditional astrology interpretations, not guarantees or medical advice.

Run the question-intent and chart-assessment regressions with `node scripts/ask-assessment-regression.mjs` from `frontend/`.

### Outcome-focused readings

Ask answers use responsive cards for a direct conclusion, relevant periods and additional matched findings. No generic next-step advice, unmatched-rule predictions, planetary names, aspect numbers, scores, technical expanders or glossary are rendered in Ask. Each conclusion has a rule ID, PDF page reference and evaluated natal/topic-divisional conditions on the internal answer object for auditing. Summary rule IDs identify the matched findings used in the conclusion; those findings are not repeated as additional cards. The annual outlook consumes the same findings and qualified timing periods.

Selected rules from the local original-page reference collection are evaluated as explicit conditions in `frontend/src/ask/bookRules.ts`, not converted from the older numeric assessment scores. They cover D9 readiness, family communication, seventh-house support, caring associations and post-marriage strain/mitigation; D10 natal-lord strength, repeated growth/setback patterns, independent-working-style conditions, business partnerships and twelve profession-lord placements; D7 parenting foundations and guidance; D4 residence/fixed assets; and D20 guidance/reflection. Natal fifth-house promise includes the Saptamsha book's unoccupied/unaspected-house exception. Venus in the D9 twelfth is not automatically treated as adverse. Career fields use the documented natal fifth-lord star ruler, its natal sign, and its professional connection in D10, not weighted planet rankings. These sign-based themes do not identify one guaranteed occupation.

A rule produces a finding only when its conditions match. An absent favourable pattern is not a negative prediction. Specific career and marriage questions filter out unrelated rules; an insufficient result is stated once instead of filling the answer with generic cards. Genuine strain plus protective associations can produce a mitigated conclusion. Appearance, medical and two-person compatibility requests state their limitations without substituting unrelated predictions.

Marriage timing requires both main/sub-period lords to connect with the natal partnership area and the D9 dynamic houses. Chara marriage checks use the seventh lord from each running sign and its connection to the natal marriage lord or spouse significator. Career periods require relevant natal and D10 connections; parenting periods check natal/D9 relevance and D7 activation. Only current/future matches within ten years are returned, intersected with the main period. No matching period produces an explicit inconclusive result. These broad opportunities are not finely calculated event dates. References use **1-based PDF page numbers**, not printed book page numbers.

The supplied books refer to **progressed Yogini**, but the application calculates ordinary Yogini periods only. Ordinary Yogini is therefore excluded from these source-qualified outcome dates and is not counted as progressed confirmation. The legacy internal heuristic timing engine remains separate. Source-qualified property/spiritual dates are not yet implemented and are not replaced with heuristic dates. Missing progression and incomplete event-date confirmation are disclosed in everyday language. Birth-chart names never determine a sex/gender-specific marriage significator.

This is a selected-rule implementation, not a complete digitisation of all 1,338 source pages or all divisional-chart chapters. Legacy scores and career-field rankings are app heuristics, not book probabilities. Saturn service/self-employment classification, planetary war, gender-specific physical descriptions, two-chart matching and fine event-date methods are not inferred from incomplete inputs. Claims of certain infertility, child sex, illness, death, divorce or guaranteed events are not presented as facts; health does not return forecast dates. Missing required planets or divisional placements are rejected before the answer builder runs instead of silently substituting the natal chart.

## Place search

Birthplaces are searched through the free [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api), which returns coordinates and an IANA timezone with no API key. Celestia skips any result without a timezone and never guesses one.

To use a different Open-Meteo-compatible endpoint, set `CELESTIA_GEOCODER_URL`. Review the provider's terms and attribution requirements before production use.

## API

- `GET /api/places?q=<text>` returns `[{placeName, latitude, longitude, timeZone}]`.
- `POST /api/chart` with `{name?, date, time, placeName, latitude, longitude, timeZone, ayanamsa}` returns the chart.
- Errors are always `{"error": "message"}`.
