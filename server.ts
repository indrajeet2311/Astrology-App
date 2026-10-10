import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateChart, calculateDailyPanchang, calculateAnnualCharts } from './src/server/chartCalculator';
import { matchCharts } from './src/server/kundliMatcher';
import {
  calculateSaturnCycles,
  calculateSlowTransits,
  calculateTransitCalendar,
  calculateFestivalCalendar,
} from './src/server/transitsAndFestivals';
import {
  addConsultation,
  getAllConsultations,
  updateConsultationStatus,
  deleteConsultation,
} from './src/server/consultationsStore';
import {
  registerUser,
  loginUser,
  adminPasskeyLogin,
  getSession,
  revokeSession,
  getUserCharts,
  saveUserChart,
  deleteUserChart,
  updateUserChart,
  syncLocalCharts,
  getClientConsultations,
  SUPER_ADMIN_EMAIL,
} from './src/server/userStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ---------------- API Routes ----------------

// 1. Geocoding search (Open-Meteo)
app.get('/api/places', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json([]);
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }

    const data = (await response.json()) as {
      results?: Array<{
        name: string;
        admin1?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
      }>;
    };

    if (!data.results) {
      return res.json([]);
    }

    const places = [];
    for (const hit of data.results) {
      if (!hit.timezone || hit.latitude === undefined || hit.longitude === undefined) {
        continue;
      }
      const parts = [hit.name, hit.admin1, hit.country].filter(Boolean);
      const label = Array.from(new Set(parts)).join(', ');
      places.push({
        placeName: label,
        latitude: hit.latitude,
        longitude: hit.longitude,
        timeZone: hit.timezone,
      });
    }

    return res.json(places);
  } catch (err) {
    console.error('Places search failed:', err);
    return res.status(500).json({ error: 'Place search is temporarily unavailable.' });
  }
});

// 2. Chart calculation
app.post('/api/chart', (req, res) => {
  try {
    const result = calculateChart(req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('Chart calculation error:', err);
    return res.status(400).json({ error: err.message || 'Chart calculation failed.' });
  }
});

// 3. Annual return charts
app.post('/api/chart/annual', (req, res) => {
  try {
    const { birth, year } = req.body;
    const result = calculateAnnualCharts(birth, Number(year));
    return res.json(result);
  } catch (err: any) {
    console.error('Annual charts calculation error:', err);
    return res.status(400).json({ error: err.message || 'Annual charts calculation failed.' });
  }
});

// 4. Kundli Match
app.post('/api/chart/match', (req, res) => {
  try {
    const { bride, groom } = req.body;
    const brideChart = calculateChart(bride);
    const groomChart = calculateChart(groom);
    const result = matchCharts(brideChart, groomChart);
    return res.json(result);
  } catch (err: any) {
    console.error('Match calculation error:', err);
    return res.status(400).json({ error: err.message || 'Match calculation failed.' });
  }
});

// 5. Saturn cycles
app.post('/api/chart/saturn-cycles', (req, res) => {
  try {
    const result = calculateSaturnCycles(req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('Saturn cycles calculation error:', err);
    return res.status(400).json({ error: err.message || 'Saturn cycles calculation failed.' });
  }
});

// 6. Transit calendar
app.post('/api/chart/transit-calendar', (req, res) => {
  try {
    const { birth, from } = req.body;
    const result = calculateTransitCalendar(birth, from);
    return res.json(result);
  } catch (err: any) {
    console.error('Transit calendar calculation error:', err);
    return res.status(400).json({ error: err.message || 'Transit calendar calculation failed.' });
  }
});

// 7. Slow transits
app.post('/api/chart/slow-transits', (req, res) => {
  try {
    const { birth, from, to } = req.body;
    const result = calculateSlowTransits(birth, from, to);
    return res.json(result);
  } catch (err: any) {
    console.error('Slow transits calculation error:', err);
    return res.status(400).json({ error: err.message || 'Slow transits calculation failed.' });
  }
});

// 8. Festival calendar
app.post('/api/calendar/festivals', (req, res) => {
  try {
    const result = calculateFestivalCalendar(req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('Festival calendar calculation error:', err);
    return res.status(400).json({ error: err.message || 'Festival calendar calculation failed.' });
  }
});

// 9. Daily Panchang
app.post('/api/panchang', (req, res) => {
  try {
    const result = calculateDailyPanchang(req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('Panchang calculation error:', err);
    return res.status(400).json({ error: err.message || 'Panchang calculation failed.' });
  }
});

// Helper to resolve session from Authorization header
function getAuthSession(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return getSession(parts[1]);
  }
  return null;
}

// ---------------- Authentication & Accounts ----------------

// Register new client account
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    const { user, session } = registerUser(String(name), String(email), String(password));
    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: session.token,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

// Login (Client or Admin via Email + Password)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }
    const { user, session } = loginUser(String(email), String(password));
    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: session.token,
    });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid credentials.' });
  }
});

// Fast Admin Passkey Login (For Astrologer Indrajeet)
app.post('/api/auth/admin-login', (req, res) => {
  try {
    const { passkey } = req.body;
    if (!passkey) {
      return res.status(400).json({ error: 'Admin passkey is required.' });
    }
    const { session } = adminPasskeyLogin(String(passkey));
    return res.json({
      success: true,
      user: { id: session.userId, name: session.name, email: session.email, role: session.role },
      token: session.token,
    });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid admin passkey.' });
  }
});

// Current User Profile
app.get('/api/auth/me', (req, res) => {
  const session = getAuthSession(req);
  if (!session) {
    return res.json({ user: null });
  }
  return res.json({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    revokeSession(authHeader.slice(7));
  }
  return res.json({ success: true });
});

// ---------------- Client Cloud Vault (Saved Charts) ----------------

// Get user's cloud saved charts
app.get('/api/user/charts', (req, res) => {
  const session = getAuthSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Please sign in to access your cloud vault.' });
  }
  const charts = getUserCharts(session.userId);
  return res.json({ charts });
});

// Save a chart to user's cloud vault
app.post('/api/user/charts', (req, res) => {
  const session = getAuthSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Please sign in to save charts to your account.' });
  }
  const { payload, label, relationship, notes } = req.body;
  if (!payload || !payload.date || !payload.time || !payload.placeName) {
    return res.status(400).json({ error: 'Invalid birth details payload.' });
  }
  const saved = saveUserChart(session.userId, { payload, label, relationship, notes });
  return res.json({ success: true, chart: saved, message: 'Chart saved to your Cloud Vault.' });
});

// Delete a chart from user's cloud vault
app.delete('/api/user/charts/:id', (req, res) => {
  const session = getAuthSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Please sign in to manage your saved charts.' });
  }
  const ok = deleteUserChart(session.userId, req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Chart not found in your vault.' });
  }
  return res.json({ success: true });
});

// Update chart metadata (label, relationship, notes)
app.patch('/api/user/charts/:id', (req, res) => {
  const session = getAuthSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Please sign in.' });
  }
  const { label, relationship, notes } = req.body;
  const updated = updateUserChart(session.userId, req.params.id, { label, relationship, notes });
  if (!updated) {
    return res.status(404).json({ error: 'Chart not found.' });
  }
  return res.json({ success: true, chart: updated });
});

// Sync local browser charts into user's account
app.post('/api/user/charts/sync', (req, res) => {
  const session = getAuthSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Please sign in to sync charts.' });
  }
  const { localCharts } = req.body;
  if (!Array.isArray(localCharts)) {
    return res.status(400).json({ error: 'Invalid charts array.' });
  }
  const allCharts = syncLocalCharts(session.userId, localCharts);
  return res.json({ success: true, charts: allCharts });
});

// Client's personal consultation inquiries
app.get('/api/user/consultations', (req, res) => {
  const session = getAuthSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Please sign in to view your inquiries.' });
  }
  const inquiries = getClientConsultations(session.email);
  return res.json({ consultations: inquiries });
});

// 10. Consultations
app.post('/api/consultations', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      contactMethod,
      topic,
      question,
      availability,
      timezone,
      birthDate,
      birthTime,
      birthPlace,
      shareBirthDetails,
      website,
    } = req.body;

    // Honeypot spam protection
    if (website && String(website).trim().length > 0) {
      return res.status(202).json({ message: 'Your consultation request was sent.' });
    }

    if (!name || !email || !topic || !question) {
      return res.status(400).json({ error: 'Please provide your name, email, guidance area and question.' });
    }

    const record = addConsultation({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : undefined,
      contactMethod: contactMethod === 'phone' ? 'phone' : 'email',
      topic: String(topic).trim(),
      question: String(question).trim(),
      availability: availability ? String(availability).trim() : undefined,
      timezone: timezone ? String(timezone).trim() : 'UTC',
      birthDate: shareBirthDetails ? birthDate : undefined,
      birthTime: shareBirthDetails ? birthTime : undefined,
      birthPlace: shareBirthDetails ? birthPlace : undefined,
      shareBirthDetails: Boolean(shareBirthDetails),
    });

    // Automatic webhook delivery to Google Apps Script (Google Sheets & Gmail notifications)
    const scriptUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbwIxjTd9qPXb82GasVc-TXyJv9NdLFFW-7LUtCik0FRRauXrl28-qH4EkD97a6NT6EzgA/exec';
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          token: process.env.GOOGLE_APPS_SCRIPT_TOKEN,
          type: 'consultation',
        }),
      })
        .then(async (r) => {
          console.log(`[Google Apps Script] Synced consultation #${record.id} - status ${r.status}`);
        })
        .catch((e) => console.warn('Consultation webhook notification failed:', e));
    }

    return res.json({
      success: true,
      id: record.id,
      message: `Your consultation request has been received (Ref: #${record.id}). We will reach out to you via ${record.contactMethod === 'phone' ? 'phone' : 'email'} shortly.`,
      consultation: record,
    });
  } catch (err: any) {
    console.error('Consultation submission error:', err);
    return res.status(500).json({ error: 'Failed to process consultation request.' });
  }
});

// Admin-only Consultations Inbox (Role-Based Access Control)
app.get('/api/consultations', (req, res) => {
  const session = getAuthSession(req);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Astrologer administrator credentials required.' });
  }
  try {
    const records = getAllConsultations();
    return res.json({ consultations: records, count: records.length });
  } catch (err: any) {
    console.error('Failed to retrieve consultations:', err);
    return res.status(500).json({ error: 'Failed to retrieve consultations.' });
  }
});

app.patch('/api/consultations/:id', (req, res) => {
  const session = getAuthSession(req);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Astrologer administrator credentials required.' });
  }
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updated = updateConsultationStatus(id, status, notes);
    if (!updated) {
      return res.status(404).json({ error: 'Consultation request not found.' });
    }
    return res.json({ success: true, consultation: updated });
  } catch (err: any) {
    console.error('Failed to update consultation:', err);
    return res.status(500).json({ error: 'Failed to update consultation.' });
  }
});

app.delete('/api/consultations/:id', (req, res) => {
  const session = getAuthSession(req);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Astrologer administrator credentials required.' });
  }
  try {
    const { id } = req.params;
    const deleted = deleteConsultation(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Consultation request not found.' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete consultation:', err);
    return res.status(500).json({ error: 'Failed to delete consultation.' });
  }
});

// 11. Leads
app.post('/api/leads/chart', (req, res) => {
  const scriptUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwIxjTd9qPXb82GasVc-TXyJv9NdLFFW-7LUtCik0FRRauXrl28-qH4EkD97a6NT6EzgA/exec';
  if (scriptUrl) {
    fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...req.body,
        token: process.env.GOOGLE_APPS_SCRIPT_TOKEN,
        type: 'chartLead',
      }),
    }).catch(() => {});
  }
  return res.status(202).json({ message: 'Noted.' });
});

// 12. Webhook status & connectivity test
app.get('/api/consultations/webhook-status', (_req, res) => {
  const configuredUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbwIxjTd9qPXb82GasVc-TXyJv9NdLFFW-7LUtCik0FRRauXrl28-qH4EkD97a6NT6EzgA/exec';
  return res.json({
    connected: Boolean(configuredUrl),
    url: configuredUrl,
  });
});

app.post('/api/consultations/test-webhook', async (req, res) => {
  const session = getAuthSession(req);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Astrologer administrator credentials required.' });
  }
  try {
    const url =
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbwIxjTd9qPXb82GasVc-TXyJv9NdLFFW-7LUtCik0FRRauXrl28-qH4EkD97a6NT6EzgA/exec';
    const testPayload = {
      type: 'consultation',
      id: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
      name: 'Integration Test',
      email: 'indrajeetbhattacharya5@gmail.com',
      phone: '+1 234 567 890',
      contactMethod: 'email',
      topic: 'Connection Verification',
      question: 'Test inquiry confirming automatic sync with your Google Sheet and Gmail alert.',
      timezone: 'UTC',
      shareBirthDetails: false,
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });
    const result = await response.json().catch(() => ({ status: 'success' }));
    return res.json({ success: true, url, result });
  } catch (err: any) {
    console.error('Webhook test error:', err);
    return res.status(500).json({ error: err.message || 'Webhook test failed' });
  }
});

// ---------------- Vite / Static Frontend ----------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
