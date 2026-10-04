import {
  planet, lordOfHouse, occupants, aspectors, ordinal, hasNeechaBhanga, BENEFICS, MALEFICS, vargaLord, vargaHouseOf,
  vargaOccupants, vargaStatus, vargottama,
} from './core';
import type { Context, Evidence } from './core';
import { signStatus } from '../vargas';

export interface Assessment {
  /** 5-95; 50 is neutral. */
  score: number;
  evidence: Evidence[];
}

export interface Verdict {
  label: string;
  tone: 'good' | 'bad' | 'neutral';
}

export function verdictFor(score: number, labels: [string, string, string, string]): Verdict {
  if (score >= 70) return { label: labels[0], tone: 'good' };
  if (score >= 55) return { label: labels[1], tone: 'good' };
  if (score >= 40) return { label: labels[2], tone: 'neutral' };
  return { label: labels[3], tone: 'bad' };
}

const GOOD_HOUSES = [1, 2, 4, 5, 7, 9, 10, 11];
const DUSTHANA = [6, 8, 12];

const STATUS_POINTS: Record<string, number> = {
  Exalted: 9, Own: 8, 'Adhi Mitra': 5, Mitra: 3, Sama: 0, Shatru: -4, 'Adhi Shatru': -7, Debilitated: -9, Node: 0,
};
export const STATUS_TEXT: Record<string, string> = {
  Exalted: 'exalted', Own: 'in its own sign', 'Adhi Mitra': 'in a very friendly sign', Mitra: 'in a friendly sign',
  Sama: 'in a neutral sign', Shatru: 'in an enemy sign', 'Adhi Shatru': 'in a very hostile sign', Debilitated: 'debilitated', Node: 'placed',
};

/**
 * Same reading as assessHouse but inside a divisional chart (D9 for marriage, D10 for career, D4 for property...):
 * the lord of the varga house, where it sits, its dignity there, who occupies the house and the karaka's dignity.
 */
export function assessVarga(
  ctx: Context, division: string, house: number, karaka: string | null, label: string, upachaya = false,
): Assessment {
  const evidence: Evidence[] = [];
  let score = 50;
  const lordName = vargaLord(ctx, division, house);
  const lordHouse = vargaHouseOf(ctx, lordName, division);
  const tag = `${label} (${division})`;

  if (GOOD_HOUSES.includes(lordHouse)) {
    score += 8;
    evidence.push({ text: `${tag}: the ${ordinal(house)} lord ${lordName} sits in the ${ordinal(lordHouse)} house, a supportive placement.`, tone: 'good' });
  } else if (DUSTHANA.includes(lordHouse)) {
    score -= 10;
    evidence.push({ text: `${tag}: the ${ordinal(house)} lord ${lordName} falls in the ${ordinal(lordHouse)} house, a difficult placement.`, tone: 'bad' });
  }

  const status = vargaStatus(ctx, lordName, division);
  score += STATUS_POINTS[status];
  evidence.push({
    text: `${tag}: ${lordName} is ${STATUS_TEXT[status]}.`,
    tone: STATUS_POINTS[status] > 2 ? 'good' : STATUS_POINTS[status] < -2 ? 'bad' : 'neutral',
  });
  if (vargottama(ctx, lordName, division)) {
    score += 4;
    evidence.push({ text: `${tag}: ${lordName} is Vargottama (same sign in D1 and ${division}), which adds strength.`, tone: 'good' });
  }

  for (const name of vargaOccupants(ctx, division, house)) {
    if (BENEFICS.includes(name)) {
      score += 6;
      evidence.push({ text: `${tag}: ${name} occupies the ${ordinal(house)} house and supports it.`, tone: 'good' });
    } else if (upachaya && ['Saturn', 'Mars', 'Sun', 'Rahu'].includes(name)) {
      score += 3;
      evidence.push({ text: `${tag}: ${name} in the ${ordinal(house)} house gives drive.`, tone: 'good' });
    } else if (MALEFICS.includes(name)) {
      score -= 5;
      evidence.push({ text: `${tag}: ${name} occupies the ${ordinal(house)} house and adds friction.`, tone: 'bad' });
    }
  }

  if (karaka) {
    const k = vargaStatus(ctx, karaka, division);
    score += Math.round(STATUS_POINTS[k] * 0.7);
    if (STATUS_POINTS[k] !== 0) {
      evidence.push({
        text: `${tag}: ${karaka}, the natural significator, is ${STATUS_TEXT[k]}.`,
        tone: STATUS_POINTS[k] > 0 ? 'good' : 'bad',
      });
    }
    if (vargottama(ctx, karaka, division)) {
      score += 3;
      evidence.push({ text: `${tag}: ${karaka} is Vargottama.`, tone: 'good' });
    }
  }
  return { score: Math.max(5, Math.min(95, score)), evidence };
}

export function blend(main: Assessment, varga: Assessment, vargaWeight: number): Assessment {
  return {
    score: Math.round(main.score * (1 - vargaWeight) + varga.score * vargaWeight),
    evidence: [...main.evidence, ...varga.evidence],
  };
}

/** Assess a house in D1, then fold in its divisional chart so the result adapts to the theme. */
export function assessWithVarga(
  ctx: Context, house: number, karaka: string | null, division: string, label: string,
  vargaWeight: number, upachaya = false,
): { combined: Assessment; main: Assessment; varga: Assessment } {
  const main = assessHouse(ctx, house, karaka, upachaya);
  const varga = assessVarga(ctx, division, house, karaka, label, upachaya);
  return { combined: blend(main, varga, vargaWeight), main, varga };
}

/**
 * Natal promise of one house: how placed and strong its lord is, who occupies or aspects it, and how its
 * natural significator fares. `upachaya` treats malefics in the house as helpful (10th, 3rd, 6th, 11th).
 */
export function assessHouse(ctx: Context, house: number, karaka: string | null, upachaya = false): Assessment {
  const evidence: Evidence[] = [];
  let score = 50;
  const lordName = lordOfHouse(ctx, house);
  const lord = planet(ctx, lordName);
  const label = `${ordinal(house)} lord ${lordName}`;

  if (GOOD_HOUSES.includes(lord.house)) {
    score += 8;
    evidence.push({ text: `${label} is well placed in the ${ordinal(lord.house)} house.`, tone: 'good' });
  } else if (DUSTHANA.includes(lord.house)) {
    score -= 10;
    evidence.push({ text: `${label} falls in the ${ordinal(lord.house)} house, a difficult placement.`, tone: 'bad' });
  } else {
    evidence.push({ text: `${label} is in the ${ordinal(lord.house)} house.`, tone: 'neutral' });
  }

  if (lord.dignity === 'EXALTED' || lord.dignity === 'OWN') {
    score += lord.dignity === 'EXALTED' ? 10 : 8;
    evidence.push({ text: `${lordName} is ${lord.dignity === 'EXALTED' ? 'exalted' : 'in its own sign'}.`, tone: 'good' });
  } else if (lord.dignity === 'DEBILITATED') {
    const cancelled = hasNeechaBhanga(ctx, lordName);
    score -= cancelled ? 3 : 10;
    evidence.push({
      text: cancelled ? `${lordName} is debilitated, but the debilitation is cancelled.` : `${lordName} is debilitated.`,
      tone: cancelled ? 'neutral' : 'bad',
    });
  }
  if (lord.combust) {
    score -= 5;
    evidence.push({ text: `${lordName} is combust (too close to the Sun).`, tone: 'bad' });
  }
  const sign = signStatus(lord, ctx.relations);
  if (sign) {
    const pts = { 'Adhi Mitra': 4, Mitra: 2, Sama: 0, Shatru: -3, 'Adhi Shatru': -5, Own: 0 }[sign.compound];
    score += pts;
    evidence.push({ text: `${lordName} is ${sign.text}.`, tone: pts > 1 ? 'good' : pts < -1 ? 'bad' : 'neutral' });
  }

  const ratio = ctx.strength[lordName];
  if (ratio !== undefined) {
    if (ratio >= 1.2) {
      score += 6;
      evidence.push({ text: `${lordName} has strong overall strength (Shadbala ratio ${ratio.toFixed(2)}).`, tone: 'good' });
    } else if (ratio < 0.85) {
      score -= 5;
      evidence.push({ text: `${lordName} is on the weak side in Shadbala (ratio ${ratio.toFixed(2)}).`, tone: 'bad' });
    }
  }

  for (const name of occupants(ctx, house)) {
    if (BENEFICS.includes(name)) {
      score += 6;
      evidence.push({ text: `${name} occupies the ${ordinal(house)} house and supports it.`, tone: 'good' });
    } else if (upachaya && ['Saturn', 'Mars', 'Sun', 'Rahu'].includes(name)) {
      score += 3;
      evidence.push({ text: `${name} in the ${ordinal(house)} house gives drive and persistence.`, tone: 'good' });
    } else if (MALEFICS.includes(name)) {
      score -= 6;
      evidence.push({ text: `${name} occupies the ${ordinal(house)} house and adds friction.`, tone: 'bad' });
    }
  }
  for (const name of aspectors(ctx, house)) {
    if (BENEFICS.includes(name)) {
      score += 4;
      evidence.push({ text: `${name} aspects the ${ordinal(house)} house.`, tone: 'good' });
    } else if (MALEFICS.includes(name) && !upachaya) {
      score -= 3;
      evidence.push({ text: `${name} aspects the ${ordinal(house)} house.`, tone: 'bad' });
    }
  }

  if (karaka) {
    const k = planet(ctx, karaka);
    if (k.dignity === 'EXALTED' || k.dignity === 'OWN') {
      score += 6;
      evidence.push({ text: `${karaka}, the natural significator, is ${k.dignity === 'EXALTED' ? 'exalted' : 'in its own sign'}.`, tone: 'good' });
    } else if (k.dignity === 'DEBILITATED') {
      score -= 6;
      evidence.push({ text: `${karaka}, the natural significator, is debilitated.`, tone: 'bad' });
    }
    if (k.combust) {
      score -= 4;
      evidence.push({ text: `${karaka}, the natural significator, is combust.`, tone: 'bad' });
    }
  }

  return { score: Math.max(5, Math.min(95, score)), evidence };
}
