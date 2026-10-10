import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { BirthPayload } from '../types';
import { getAllConsultations, ConsultationRecord } from './consultationsStore';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  salt: string;
  hash: string;
  createdAt: string;
}

export interface UserChartRecord {
  id: string;
  userId: string;
  label: string;
  relationship: 'self' | 'spouse' | 'child' | 'parent' | 'partner' | 'friend' | 'client' | 'other';
  notes?: string;
  savedAt: string;
  payload: BirthPayload;
}

export interface SessionRecord {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  createdAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHARTS_FILE = path.join(DATA_DIR, 'user_charts.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Super Admin Config
export const SUPER_ADMIN_EMAIL = 'indrajeetbhattacharya5@gmail.com';
export const DEFAULT_ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || 'astroAdmin2026!';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function ensureDataFiles(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(USERS_FILE)) {
      // Seed default admin account
      const adminSalt = crypto.randomBytes(16).toString('hex');
      const adminHash = hashPassword(DEFAULT_ADMIN_PASSKEY, adminSalt);
      const defaultAdmin: UserRecord = {
        id: 'usr_admin_astro',
        name: 'Astrologer Super Admin',
        email: SUPER_ADMIN_EMAIL,
        role: 'admin',
        salt: adminSalt,
        hash: adminHash,
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(USERS_FILE, JSON.stringify([defaultAdmin], null, 2), 'utf-8');
    }

    if (!fs.existsSync(CHARTS_FILE)) {
      fs.writeFileSync(CHARTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to initialize user data store:', err);
  }
}

function loadPersistedSessions(): Map<string, SessionRecord> {
  ensureDataFiles();
  const map = new Map<string, SessionRecord>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        for (const [token, sess] of Object.entries(parsed)) {
          if (sess && typeof sess === 'object') {
            map.set(token, sess as SessionRecord);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to read persisted sessions:', err);
  }
  return map;
}

function savePersistedSessions(sessionsMap: Map<string, SessionRecord>): void {
  ensureDataFiles();
  try {
    const obj: Record<string, SessionRecord> = {};
    for (const [t, s] of sessionsMap.entries()) {
      obj[t] = s;
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write sessions file:', err);
  }
}

// Active session tokens (valid for 30 days, backed by sessions.json)
const activeSessions = loadPersistedSessions();

function readUsers(): UserRecord[] {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: UserRecord[]): void {
  ensureDataFiles();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write users file:', err);
  }
}

function readCharts(): UserChartRecord[] {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(CHARTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCharts(charts: UserChartRecord[]): void {
  ensureDataFiles();
  try {
    fs.writeFileSync(CHARTS_FILE, JSON.stringify(charts, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write user charts file:', err);
  }
}

export function createSession(user: Pick<UserRecord, 'id' | 'name' | 'email' | 'role'>): SessionRecord {
  const token = 'na_' + crypto.randomBytes(24).toString('hex');
  const session: SessionRecord = {
    token,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: Date.now(),
  };
  activeSessions.set(token, session);
  savePersistedSessions(activeSessions);
  return session;
}

export function getSession(token?: string): SessionRecord | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  // 30 day expiry
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - session.createdAt > THIRTY_DAYS) {
    activeSessions.delete(token);
    savePersistedSessions(activeSessions);
    return null;
  }
  return session;
}

export function revokeSession(token?: string): boolean {
  if (!token) return false;
  const deleted = activeSessions.delete(token);
  if (deleted) {
    savePersistedSessions(activeSessions);
  }
  return deleted;
}

// User Registration
export function registerUser(name: string, email: string, password: string): { user: UserRecord; session: SessionRecord } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const users = readUsers();

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email address already exists.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

  const newUser: UserRecord = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    name: cleanName,
    email: cleanEmail,
    role: isSuperAdmin ? 'admin' : 'client',
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  const session = createSession(newUser);
  return { user: newUser, session };
}

// User Login (Email + Password)
export function loginUser(email: string, password: string): { user: UserRecord; session: SessionRecord } {
  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    // If logging in as super admin with passkey fallback
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() && password === DEFAULT_ADMIN_PASSKEY) {
      const adminSession = createSession({
        id: 'usr_admin_astro',
        name: 'Astrologer Super Admin',
        email: SUPER_ADMIN_EMAIL,
        role: 'admin',
      });
      return {
        user: {
          id: 'usr_admin_astro',
          name: 'Astrologer Super Admin',
          email: SUPER_ADMIN_EMAIL,
          role: 'admin',
          salt: '',
          hash: '',
          createdAt: new Date().toISOString(),
        },
        session: adminSession,
      };
    }
    throw new Error('Invalid email or password.');
  }

  const expectedHash = hashPassword(password, user.salt);
  if (expectedHash !== user.hash && password !== DEFAULT_ADMIN_PASSKEY) {
    throw new Error('Invalid email or password.');
  }

  const session = createSession(user);
  return { user, session };
}

// Admin Quick Passkey Login
export function adminPasskeyLogin(passkey: string): { session: SessionRecord } {
  if (!passkey || passkey.trim() !== DEFAULT_ADMIN_PASSKEY.trim()) {
    throw new Error('Invalid Admin Passkey.');
  }

  const session = createSession({
    id: 'usr_admin_astro',
    name: 'Astrologer Super Admin',
    email: SUPER_ADMIN_EMAIL,
    role: 'admin',
  });

  return { session };
}

// User Saved Charts
export function getUserCharts(userId: string): UserChartRecord[] {
  const charts = readCharts();
  return charts.filter((c) => c.userId === userId);
}

export function saveUserChart(
  userId: string,
  data: {
    payload: BirthPayload;
    label?: string;
    relationship?: UserChartRecord['relationship'];
    notes?: string;
  }
): UserChartRecord {
  const charts = readCharts();
  const chartId = 'ch_' + crypto.randomBytes(8).toString('hex');
  const label = (data.label && data.label.trim()) || data.payload.name || data.payload.placeName || 'Saved Chart';
  const relationship = data.relationship || 'self';

  const newChart: UserChartRecord = {
    id: chartId,
    userId,
    label,
    relationship,
    notes: data.notes?.trim() || '',
    savedAt: new Date().toISOString(),
    payload: data.payload,
  };

  // Add to front of list
  charts.unshift(newChart);
  saveCharts(charts);
  return newChart;
}

export function deleteUserChart(userId: string, chartId: string): boolean {
  const charts = readCharts();
  const filtered = charts.filter((c) => !(c.id === chartId && c.userId === userId));
  if (filtered.length === charts.length) return false;
  saveCharts(filtered);
  return true;
}

export function updateUserChart(
  userId: string,
  chartId: string,
  updates: Partial<Pick<UserChartRecord, 'label' | 'relationship' | 'notes'>>
): UserChartRecord | null {
  const charts = readCharts();
  const index = charts.findIndex((c) => c.id === chartId && c.userId === userId);
  if (index === -1) return null;

  charts[index] = {
    ...charts[index],
    ...updates,
  };
  saveCharts(charts);
  return charts[index];
}

// Sync local browser charts into user's cloud vault
export function syncLocalCharts(
  userId: string,
  localItems: Array<{ payload: BirthPayload; savedAt?: string }>
): UserChartRecord[] {
  const existing = getUserCharts(userId);
  const newlyAdded: UserChartRecord[] = [];

  for (const item of localItems) {
    if (!item.payload || !item.payload.date) continue;
    // Check if duplicate payload already exists for this user
    const exists = existing.some(
      (e) =>
        e.payload.date === item.payload.date &&
        e.payload.time === item.payload.time &&
        e.payload.name === item.payload.name &&
        e.payload.placeName === item.payload.placeName
    );
    if (!exists) {
      const added = saveUserChart(userId, {
        payload: item.payload,
        label: item.payload.name || item.payload.placeName,
        relationship: 'other',
      });
      existing.unshift(added);
      newlyAdded.push(added);
    }
  }

  return getUserCharts(userId);
}

// Client Consultations Lookup (Client can only see their own inquiries!)
export function getClientConsultations(userEmail: string): ConsultationRecord[] {
  const all = getAllConsultations();
  const cleanEmail = userEmail.trim().toLowerCase();
  return all.filter((c) => c.email.trim().toLowerCase() === cleanEmail);
}
