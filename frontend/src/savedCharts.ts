import type { Ayanamsa, BirthPayload, Chart } from './types';

const STORAGE_KEY = 'celestia.saved-charts.v1';

export interface SavedChart {
  id: string;
  savedAt: string;
  payload: BirthPayload;
}

export interface SaveResult {
  charts: SavedChart[];
  saved: boolean;
  message?: string;
}

export function payloadFromChart(chart: Chart): BirthPayload {
  const birth = chart.birthDetails;
  return {
    name: birth.name ?? '',
    date: birth.date,
    time: birth.localTime,
    placeName: birth.placeName,
    latitude: birth.latitude,
    longitude: birth.longitude,
    timeZone: birth.timeZone,
    ayanamsa: birth.ayanamsa,
    trueNode: birth.trueNode,
    houseSystem: birth.houseSystem,
    laterOffset: birth.laterOffset,
  };
}

export function loadSavedCharts(): SavedChart[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSavedChart) : [];
  } catch {
    return [];
  }
}

export function saveChart(payload: BirthPayload): SaveResult {
  const charts = loadSavedCharts();
  if (charts.some((item) => sameBirthPayload(item.payload, payload))) {
    return { charts, saved: false, message: 'This chart is already saved in this browser.' };
  }

  const next = [
    { id: crypto.randomUUID(), savedAt: new Date().toISOString(), payload },
    ...charts,
  ];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { charts: next, saved: true, message: 'Chart saved in this browser.' };
  } catch {
    return { charts, saved: false, message: 'This browser could not save the chart.' };
  }
}

export function removeSavedChart(id: string): SavedChart[] {
  const charts = loadSavedCharts();
  const next = charts.filter((item) => item.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return charts;
  }
}

export function sameBirthPayload(left: BirthPayload, right: BirthPayload): boolean {
  return left.name === right.name && left.date === right.date && left.time === right.time
    && left.placeName === right.placeName && left.latitude === right.latitude
    && left.longitude === right.longitude && left.timeZone === right.timeZone
    && left.ayanamsa === right.ayanamsa && (left.trueNode ?? false) === (right.trueNode ?? false)
    && (left.houseSystem ?? 'WHOLE_SIGN') === (right.houseSystem ?? 'WHOLE_SIGN')
    && (left.laterOffset ?? false) === (right.laterOffset ?? false);
}

function isSavedChart(value: unknown): value is SavedChart {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.savedAt !== 'string'
      || typeof record.payload !== 'object' || record.payload === null) return false;
  const payload = record.payload as Record<string, unknown>;
  return typeof payload.name === 'string' && typeof payload.date === 'string'
    && typeof payload.time === 'string' && typeof payload.placeName === 'string'
    && typeof payload.latitude === 'number' && typeof payload.longitude === 'number'
    && typeof payload.timeZone === 'string' && isAyanamsa(payload.ayanamsa)
    && (payload.trueNode === undefined || typeof payload.trueNode === 'boolean')
    && (payload.laterOffset === undefined || typeof payload.laterOffset === 'boolean')
    && (payload.houseSystem === undefined || payload.houseSystem === 'WHOLE_SIGN' || payload.houseSystem === 'EQUAL');
}

function isAyanamsa(value: unknown): value is Ayanamsa {
  return value === 'LAHIRI' || value === 'RAMAN' || value === 'KRISHNAMURTI'
    || value === 'TRUE_CHITRA' || value === 'YUKTESHWAR';
}
