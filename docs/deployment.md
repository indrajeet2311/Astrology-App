# Deployment

- Pushed the app to the public GitHub repository [`indrajeet2311/Astrology-App`](https://github.com/indrajeet2311/Astrology-App), branch `main`.
- Deployed the frontend to Vercel Hobby (free). Vercel project root: `frontend`; preset: Vite; build command: `npm run build`; output: `dist`.
- Deployed the backend to Render Free from [`render.yaml`](../render.yaml), using [`backend/Dockerfile`](../backend/Dockerfile). Service: `celestia-astro-api-indrajeet`.
- [`frontend/vercel.json`](../frontend/vercel.json) forwards `/api/*` requests to the Render API and routes frontend paths to `index.html`.
- Consultation requests are sent to `indrajeetbhattacharya5@gmail.com` through Gmail SMTP. In the Render service's **Environment** settings, set `SMTP_USERNAME` to the sending Gmail account and `SMTP_PASSWORD` to a Google app password for that account. Gmail SMTP uses `smtp.gmail.com` with STARTTLS on port 587. Google app passwords require 2-Step Verification; the normal Google account password is not suitable. Keep the app password in Render's secret environment settings, never in source code. Until both values are set, the form reports that email delivery is not configured; after setting them, redeploy/restart the Render service.
- The form submits to `POST /api/consultations`. A successful response means the SMTP server accepted the message for delivery. Delivery failures return an error to the form so the visitor is not told the request was sent.
- Verified place search and chart calculation through the public Vercel site. Chart response includes nine planets, 16 divisional signs, Panchang and transits.
- Current feature set also includes browser-local saved charts, selectable transit dates, Ashtakoota matching, a date/location Panchang lookup, division-aware planetary tables, five ayanamsas, mean/true lunar node selection, and whole-sign/equal houses.
- Changes made after this deployment are published by pushing a commit to `main`; Vercel and Render then rebuild from GitHub.
- Render Free services sleep after inactivity; the first request after sleep may take 50 seconds or more.
- Swiss Ephemeris is AGPL-licensed. Review its terms before commercial or closed-source use.
