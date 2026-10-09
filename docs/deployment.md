# Deployment

- Pushed the app to the public GitHub repository [`indrajeet2311/Astrology-App`](https://github.com/indrajeet2311/Astrology-App), branch `main`.
- Deployed the frontend to Vercel Hobby (free). Vercel project root: `frontend`; preset: Vite; build command: `npm run build`; output: `dist`.
- Deployed the backend to Render Free from [`render.yaml`](../render.yaml), using [`backend/Dockerfile`](../backend/Dockerfile). Service: `celestia-astro-api-indrajeet`.
- [`frontend/vercel.json`](../frontend/vercel.json) forwards `/api/*` requests to the Render API and routes frontend paths to `index.html`.
- Consultation requests are emailed to `ibtnextgen@gmail.com` by a Google Apps Script web app, which sends as the Google account that owns the script. The backend calls the Apps Script over HTTPS, so Render's SMTP port restrictions do not apply. Script source is in [`backend/apps-script/Code.gs`](../backend/apps-script/Code.gs).
- Apps Script setup: create a project at [script.google.com](https://script.google.com), paste in `backend/apps-script/Code.gs`, add a Script Property named `CELESTIA_WEBHOOK_TOKEN` with a long random secret, run `authorizeEmailSending` once and approve the mail permission, then deploy as a **Web app** that executes as you and is accessible to anyone. Copy the deployment's `/exec` URL.
- In the Render backend service's **Environment** settings, set `GOOGLE_APPS_SCRIPT_URL` to the `/exec` URL and `GOOGLE_APPS_SCRIPT_TOKEN` to the same random secret stored in the script property. Keep the token private. Redeploy/restart the backend after setting both values. Until configured, consultation submissions report a delivery error and offer the prefilled email-app fallback.
- Apps Script email quotas apply. Google's current consumer-account quota is 100 email recipients per day; quota limits may change.
- The form submits to `POST /api/consultations`. A successful response means the SMTP server accepted the message for delivery. Delivery failures return an error to the form so the visitor is not told the request was sent.
- Verified place search and chart calculation through the public Vercel site. Chart response includes nine planets, 16 divisional signs, Panchang and transits.
- Current feature set also includes browser-local saved charts, selectable transit dates, Ashtakoota matching, a date/location Panchang lookup, division-aware planetary tables, five ayanamsas, mean/true lunar node selection, and whole-sign/equal houses.
- Changes made after this deployment are published by pushing a commit to `main`; Vercel and Render then rebuild from GitHub.
- Render Free services sleep after inactivity; the first request after sleep may take 50 seconds or more.
- Swiss Ephemeris is AGPL-licensed. Review its terms before commercial or closed-source use.
