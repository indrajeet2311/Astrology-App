import type { AnnualChartsResponse, Chart, BirthPayload, DailyPanchang, KundliMatch, PanchangRequest, Place } from './types';
import type { FestivalCalendar, SaturnCycles, TransitCalendar } from './timelineTypes';
import type { SlowTransits } from './ask/transitTypes';

const AUTH_TOKEN_KEY = 'nextgenastro_auth_token';

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    response = await fetch(url, { ...init, headers });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new Error(navigator.onLine ? 'Cannot reach the NextGenAstro server. Please try again shortly.'
      : 'You are offline. Connect to the internet to calculate charts or load live data.');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON bodies are reported through the status code below.
  }

  if (!response.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new Error(message ?? `The server returned an error (${response.status}).`);
  }
  return body as T;
}

export function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  return request<Place[]>(`/api/places?q=${encodeURIComponent(query)}`, { signal });
}

export function calculateChart(payload: BirthPayload): Promise<Chart> {
  return request<Chart>('/api/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Fire-and-forget notification sent whenever a visitor generates a chart. Never throws and
 * never blocks the caller: the chart-calculation flow must succeed regardless of whether this
 * notification is delivered.
 */
export function notifyChartLead(payload: BirthPayload): void {
  fetch('/api/leads/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      date: payload.date,
      time: payload.time,
      placeName: payload.placeName,
      timeZone: payload.timeZone,
    }),
  }).catch(() => {
    // Intentionally ignored: this is a best-effort notification, not user-facing.
  });
}

export function matchCharts(bride: BirthPayload, groom: BirthPayload): Promise<KundliMatch> {
  return request<KundliMatch>('/api/chart/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bride, groom }),
  });
}

export interface ConsultationSubmission {
  name: string;
  email: string;
  phone: string;
  contactMethod: 'email' | 'phone';
  topic: string;
  question: string;
  availability: string;
  timezone: string;
  shareBirthDetails: boolean;
  website: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
}

export interface ConsultationItem {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone?: string;
  contactMethod: 'email' | 'phone';
  topic: string;
  question: string;
  availability?: string;
  timezone: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  shareBirthDetails: boolean;
  status: 'pending' | 'contacted' | 'completed';
  notes?: string;
}

export function submitConsultation(payload: ConsultationSubmission): Promise<{ success: boolean; id?: string; message: string; consultation?: ConsultationItem }> {
  return request<{ success: boolean; id?: string; message: string; consultation?: ConsultationItem }>('/api/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fetchConsultations(): Promise<{ consultations: ConsultationItem[]; count: number }> {
  return request<{ consultations: ConsultationItem[]; count: number }>('/api/consultations');
}

export function updateConsultation(id: string, status: 'pending' | 'contacted' | 'completed', notes?: string): Promise<{ success: boolean; consultation: ConsultationItem }> {
  return request<{ success: boolean; consultation: ConsultationItem }>(`/api/consultations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
}

export function removeConsultation(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/consultations/${id}`, {
    method: 'DELETE',
  });
}

export function calculatePanchang(payload: PanchangRequest): Promise<DailyPanchang> {
  return request<DailyPanchang>('/api/panchang', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function calculateAnnualCharts(payload: BirthPayload, year: number): Promise<AnnualChartsResponse> {
  return request<AnnualChartsResponse>('/api/chart/annual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birth: payload, year }),
  });
}

export function loadSaturnCycles(payload: BirthPayload): Promise<SaturnCycles> {
  return post<SaturnCycles>('/api/chart/saturn-cycles', payload);
}

export function loadTransitCalendar(payload: BirthPayload, from: string): Promise<TransitCalendar> {
  return post<TransitCalendar>('/api/chart/transit-calendar', { birth: payload, from });
}

export function loadFestivalCalendar(payload: {
  year: number; placeName: string; latitude: number; longitude: number; timeZone: string; ayanamsa: string;
}): Promise<FestivalCalendar> {
  return post<FestivalCalendar>('/api/calendar/festivals', payload);
}

export function loadSlowTransits(payload: BirthPayload, from: string, to: string): Promise<SlowTransits> {
  return post<SlowTransits>('/api/chart/slow-transits', { birth: payload, from, to });
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// ---------------- Authentication & User APIs ----------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
}

export interface CloudSavedChart {
  id: string;
  userId: string;
  label: string;
  relationship: 'self' | 'spouse' | 'child' | 'parent' | 'partner' | 'friend' | 'client' | 'other';
  notes?: string;
  savedAt: string;
  payload: BirthPayload;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await request<{ user: AuthUser | null }>('/api/auth/me');
    return res.user;
  } catch {
    return null;
  }
}

export async function registerClient(name: string, email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const res = await post<{ success: boolean; user: AuthUser; token: string }>('/api/auth/register', { name, email, password });
  setAuthToken(res.token);
  return res;
}

export async function loginWithEmail(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const res = await post<{ success: boolean; user: AuthUser; token: string }>('/api/auth/login', { email, password });
  setAuthToken(res.token);
  return res;
}

export async function loginWithAdminPasskey(passkey: string): Promise<{ user: AuthUser; token: string }> {
  const res = await post<{ success: boolean; user: AuthUser; token: string }>('/api/auth/admin-login', { passkey });
  setAuthToken(res.token);
  return res;
}

export async function logoutUser(): Promise<void> {
  try {
    await post('/api/auth/logout', {});
  } finally {
    setAuthToken(null);
  }
}

// ---------------- Cloud Saved Charts (User Vault) ----------------

export async function fetchCloudCharts(): Promise<CloudSavedChart[]> {
  const res = await request<{ charts: CloudSavedChart[] }>('/api/user/charts');
  return res.charts;
}

export async function saveCloudChart(data: {
  payload: BirthPayload;
  label?: string;
  relationship?: CloudSavedChart['relationship'];
  notes?: string;
}): Promise<CloudSavedChart> {
  const res = await post<{ success: boolean; chart: CloudSavedChart }>('/api/user/charts', data);
  return res.chart;
}

export async function deleteCloudChart(id: string): Promise<void> {
  await request(`/api/user/charts/${id}`, { method: 'DELETE' });
}

export async function updateCloudChart(
  id: string,
  updates: { label?: string; relationship?: CloudSavedChart['relationship']; notes?: string }
): Promise<CloudSavedChart> {
  return request<CloudSavedChart>(`/api/user/charts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function syncLocalChartsToCloud(
  localCharts: Array<{ payload: BirthPayload; savedAt?: string }>
): Promise<CloudSavedChart[]> {
  const res = await post<{ success: boolean; charts: CloudSavedChart[] }>('/api/user/charts/sync', { localCharts });
  return res.charts;
}

export async function fetchUserConsultations(): Promise<ConsultationItem[]> {
  const res = await request<{ consultations: ConsultationItem[] }>('/api/user/consultations');
  return res.consultations;
}

