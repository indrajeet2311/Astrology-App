import type { AnnualChartsResponse, Chart, BirthPayload, DailyPanchang, KundliMatch, PanchangRequest, Place } from './types';
import type { FestivalCalendar, SaturnCycles, TransitCalendar } from './timelineTypes';
import type { SlowTransits } from './ask/transitTypes';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new Error('Cannot reach the NextGenAstro server. Make sure the backend is running.');
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

export function matchCharts(bride: BirthPayload, groom: BirthPayload): Promise<KundliMatch> {
  return request<KundliMatch>('/api/chart/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bride, groom }),
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
