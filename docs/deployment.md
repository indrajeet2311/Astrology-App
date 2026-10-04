# Deployment

- Pushed the app to the public GitHub repository [`indrajeet2311/Astrology-App`](https://github.com/indrajeet2311/Astrology-App), branch `main`.
- Deployed the frontend to Vercel Hobby (free). Vercel project root: `frontend`; preset: Vite; build command: `npm run build`; output: `dist`.
- Deployed the backend to Render Free from [`render.yaml`](../render.yaml), using [`backend/Dockerfile`](../backend/Dockerfile). Service: `celestia-astro-api-indrajeet`.
- [`frontend/vercel.json`](../frontend/vercel.json) forwards `/api/*` requests to the Render API and routes frontend paths to `index.html`.
- Verified place search and chart calculation through the public Vercel site. Chart response includes nine planets, 16 divisional signs, Panchang and transits.
- Current feature set also includes browser-local saved charts, selectable transit dates, Ashtakoota matching, a date/location Panchang lookup, division-aware planetary tables, five ayanamsas, mean/true lunar node selection, and whole-sign/equal houses.
- Changes made after this deployment are published by pushing a commit to `main`; Vercel and Render then rebuild from GitHub.
- Render Free services sleep after inactivity; the first request after sleep may take 50 seconds or more.
- Swiss Ephemeris is AGPL-licensed. Review its terms before commercial or closed-source use.
