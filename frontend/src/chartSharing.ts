import type { Ayanamsa, BirthPayload } from './types';

export function createChartShareUrl(payload: BirthPayload, currentUrl = window.location.href): string {
  const url = new URL(currentUrl);
  const sharePayload: BirthPayload = {
    name: payload.name,
    date: payload.date,
    time: payload.time,
    placeName: payload.placeName,
    latitude: payload.latitude,
    longitude: payload.longitude,
    timeZone: payload.timeZone,
    ayanamsa: payload.ayanamsa,
    trueNode: payload.trueNode ?? false,
    houseSystem: payload.houseSystem ?? 'WHOLE_SIGN',
  };
  url.hash = `chart=${encodeBase64Url(JSON.stringify(sharePayload))}`;
  return url.toString();
}

export function readSharedChartUrl(currentUrl = window.location.href): BirthPayload | null {
  try {
    const encoded = new URL(currentUrl).hash.slice(1);
    const value = new URLSearchParams(encoded).get('chart');
    if (!value) return null;
    const parsed: unknown = JSON.parse(decodeBase64Url(value));
    return isBirthPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function isBirthPayload(value: unknown): value is BirthPayload {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.name === 'string' && typeof payload.date === 'string'
    && typeof payload.time === 'string' && typeof payload.placeName === 'string'
    && typeof payload.latitude === 'number' && typeof payload.longitude === 'number'
    && typeof payload.timeZone === 'string' && isAyanamsa(payload.ayanamsa)
    && (payload.trueNode === undefined || typeof payload.trueNode === 'boolean')
    && (payload.houseSystem === undefined || payload.houseSystem === 'WHOLE_SIGN' || payload.houseSystem === 'EQUAL');
}

function isAyanamsa(value: unknown): value is Ayanamsa {
  return value === 'LAHIRI' || value === 'RAMAN' || value === 'KRISHNAMURTI'
    || value === 'TRUE_CHITRA' || value === 'YUKTESHWAR';
}