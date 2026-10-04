import type { Chart, BirthPayload, Place } from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new Error('Cannot reach the Celestia server. Make sure the backend is running.');
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

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
