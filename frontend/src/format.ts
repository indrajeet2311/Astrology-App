import { BODY_ABBR } from './constants';
import type { Position } from './types';

/** Degrees as D°M′S″, truncated (never rounded up into the next sign). */
export function formatDegrees(value: number): string {
  const total = Math.floor(value * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function bodyLabel(p: Position): string {
  return (BODY_ABBR[p.name] ?? p.name.slice(0, 2)) + (p.retrograde ? '℞' : '');
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
