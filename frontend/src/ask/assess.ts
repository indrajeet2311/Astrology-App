import {
  planet, lordOfHouse, occupants, aspectors, ordinal, hasNeechaBhanga, BENEFICS, MALEFICS, vargaLord, vargaHouseOf,
  vargaOccupants, vargaStatus, vargottama, functionalNature, housesRuledBy, houseKartari, vargaAspectors, vargaSign, signName, signOfHouse, vargaHouseSign,
} from './core';
import type { Context, Evidence } from './core';
import { signStatus } from '../vargas';
import { SIGN_LORDS } from '../constants';

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

export function placementComfort(house: number, status: string, naturalMalefic: boolean): string {
  const strong = ['Exalted', 'Own', 'Adhi Mitra', 'Mitra'].includes(status);
  const weak = ['Debilitated', 'Shatru', 'Adhi Shatru'].includes(status);
  if (DUSTHANA.includes(house)) return `${strong ? 'supportive dignity but' : weak ? 'weak dignity and' : 'mixed dignity with'} a demanding ${ordinal(house)}-house setting; strength and ease are not the same`;
  if ([3, 10, 11].includes(house) && naturalMalefic) return `${weak ? 'dignity needs care, although' : 'an effort-oriented setting where'} discipline and persistence can develop over time`;
  return weak ? `a constructive house setting does not remove ${STATUS_TEXT[status]} dignity` : `${strong ? 'supportive' : 'mixed'} dignity in a generally constructive house setting, subject to conjunctions and aspects`;
}

function dignityStatus(ctx: Context, name: string, division?: string): string {
  if (division) return vargaStatus(ctx, name, division);
  const position = planet(ctx, name);
  return position.dignity === 'DEBILITATED' ? 'Debilitated' : position.dignity === 'EXALTED' ? 'Exalted'
    : position.dignity === 'OWN' ? 'Own' : ['Rahu', 'Ketu'].includes(name) ? 'Node'
      : signStatus(position, ctx.relations)?.compound ?? 'Sama';
}

function lordshipLabel(ctx: Context, name: string, division?: string): string {
  const owned = housesRuledBy(ctx, name);
  if (!owned.length) return 'node acting through its hosts';
  const natal = `D1 lord of ${owned.map(ordinal).join('/')}`;
  if (!division) return natal;
  const local = Array.from({ length: 12 }, (_, index) => index + 1).filter((house) => vargaLord(ctx, division, house) === name);
  return `${natal}; ${division} lord of ${local.map(ordinal).join('/')}`;
}

export function houseFactorSummary(ctx: Context, house: number, division?: string): string {
  const layer = division ?? 'D1';
  const sign = division ? vargaHouseSign(ctx, division, house) : signOfHouse(ctx, house);
  const lord = division ? vargaLord(ctx, division, house) : lordOfHouse(ctx, house);
  const lordHouse = division ? vargaHouseOf(ctx, lord, division) : planet(ctx, lord).house;
  const lordSign = division ? vargaSign(ctx, lord, division) : planet(ctx, lord).signNumber;
  const here = division ? vargaOccupants(ctx, division, house) : occupants(ctx, house);
  const sources = division ? vargaAspectors(ctx, division, house) : aspectors(ctx, house);
  const identity = (name: string) => `${name} (${lordshipLabel(ctx, name, division)}; ${STATUS_TEXT[dignityStatus(ctx, name, division)]})`;
  const houseAspects = sources.map((name) => {
    const sourceHouse = division ? vargaHouseOf(ctx, name, division) : planet(ctx, name).house;
    const distance = ((house - sourceHouse + 12) % 12) + 1;
    return `${identity(name)} by its ${ordinal(distance)} aspect from house ${sourceHouse}`;
  });
  const links = assessPlanetInfluences(ctx, lord, division).evidence;
  const kartari = !division ? houseKartari(ctx, house) : null;
  return `${layer} ${ordinal(house)} house (${signName(sign)}): its lord ${identity(lord)} is in ${signName(lordSign)}, house ${lordHouse}. Occupants: ${here.length ? here.map(identity).join('; ') : 'none'}. House aspects: ${houseAspects.length ? houseAspects.join('; ') : 'no classical graha aspect detected'}. Lord links: ${links.length ? links.map((item) => item.text.replace(`${layer}: `, '')).join(' ') : 'no conjunction or incoming graha aspect detected'}${kartari && kartari.kind !== 'None' ? ` ${kartari.kind} from ${kartari.planets.join(', ')}.` : ''}`;
}

export function assessNode(ctx: Context, name: string, division?: string): Assessment {
  const sign = division ? vargaSign(ctx, name, division) : planet(ctx, name).signNumber;
  const house = division ? vargaHouseOf(ctx, name, division) : planet(ctx, name).house;
  const lord = SIGN_LORDS[sign - 1];
  const companions = (division ? vargaOccupants(ctx, division, house) : occupants(ctx, house))
    .filter((other) => other !== name && !['Rahu', 'Ketu'].includes(other));
  const hosts = [...new Set([lord, ...companions])];
  let adjustment = 0;
  const descriptions = hosts.map((host) => {
    const status = dignityStatus(ctx, host, division);
    const hostHouse = division ? vargaHouseOf(ctx, host, division) : planet(ctx, host).house;
    const strong = ['Exalted', 'Own', 'Adhi Mitra', 'Mitra'].includes(status);
    const weak = ['Debilitated', 'Shatru', 'Adhi Shatru'].includes(status);
    const nature = functionalNature(ctx, host);
    adjustment += strong ? 3 : weak ? -3 : 0;
    if (DUSTHANA.includes(hostHouse)) adjustment -= 2;
    adjustment += nature === 'yogakaraka' || nature === 'benefic' ? 1 : nature === 'malefic' ? -1 : 0;
    if (!division && planet(ctx, host).combust) adjustment -= 2;
    if (!division && ctx.strength[host] !== undefined) adjustment += ctx.strength[host] >= 1.2 ? 1 : ctx.strength[host] < 0.85 ? -1 : 0;
    return `${host} (${host === lord ? 'sign lord' : 'conjunction partner'}${host === lord && companions.includes(host) ? ' and conjunction partner' : ''}, ${STATUS_TEXT[status]}, house ${hostHouse}, functionally ${nature} in D1)`;
  });
  const score = Math.max(-5, Math.min(4, adjustment / hosts.length));
  return {
    score,
    evidence: [{
      text: `${division ?? 'D1'}: ${name} in ${signName(sign)} acts through ${descriptions.join('; ')}. ${name === 'Rahu' ? 'Rahu can amplify their themes, including desire and excess' : 'Ketu can redirect their themes toward detachment or disruption'}; ${score > 1 ? 'strong hosts offer constructive capacity, not automatic ease' : score < -1 ? 'weak or pressured hosts make expression more difficult' : 'the host conditions give mixed expression'}.`,
      tone: score > 1 ? 'good' : score < -1 ? 'bad' : 'neutral',
    }],
  };
}

function influenceQuality(ctx: Context, name: string, division?: string): { score: number; description: string } {
  const status = dignityStatus(ctx, name, division);
  const nature = functionalNature(ctx, name);
  const naturalPressure = MALEFICS.includes(name);
  const strong = ['Exalted', 'Own', 'Adhi Mitra', 'Mitra'].includes(status);
  const weak = ['Debilitated', 'Shatru', 'Adhi Shatru'].includes(status);
  let score = naturalPressure ? nature === 'yogakaraka' || nature === 'benefic' ? 1 : -3
    : nature === 'malefic' ? 1 : 2;
  if (strong) score += naturalPressure && !['yogakaraka', 'benefic'].includes(nature) ? 0 : 1;
  if (weak) score -= 2;
  if (!division && planet(ctx, name).combust) score -= 1;
  const role = naturalPressure && ['yogakaraka', 'benefic'].includes(nature)
    ? 'functional support alongside discipline and natural pressure'
    : !naturalPressure && nature === 'malefic' ? 'natural protection alongside difficult D1 lordship themes'
      : score > 0 ? 'support' : 'pressure';
  return { score, description: `${STATUS_TEXT[status]}, ${lordshipLabel(ctx, name, division)}, naturally ${naturalPressure ? 'malefic' : 'benefic'}, functionally ${nature} in D1; ${role}${weak ? ', limited by weak dignity' : ''}` };
}

export function assessPlanetInfluences(ctx: Context, name: string, division?: string): Assessment {
  const house = division ? vargaHouseOf(ctx, name, division) : planet(ctx, name).house;
  const companions = (division ? vargaOccupants(ctx, division, house) : occupants(ctx, house)).filter((other) => other !== name);
  const aspects = (division ? vargaAspectors(ctx, division, house) : aspectors(ctx, house)).filter((other) => other !== name);
  const evidence: Evidence[] = [];
  let adjustment = 0;
  for (const [kind, names] of [['conjoins', companions], ['aspects', aspects]] as const) {
    for (const other of names) {
      if (['Rahu', 'Ketu'].includes(other)) {
        const node = assessNode(ctx, other, division);
        adjustment += node.score;
        evidence.push(...node.evidence);
        continue;
      }
      const influence = influenceQuality(ctx, other, division);
      const sourceHouse = division ? vargaHouseOf(ctx, other, division) : planet(ctx, other).house;
      const distance = ((house - sourceHouse + 12) % 12) + 1;
      const mutual = kind === 'aspects' && (division ? vargaAspectors(ctx, division, sourceHouse) : aspectors(ctx, sourceHouse)).includes(name);
      const returnDistance = ((sourceHouse - house + 12) % 12) + 1;
      adjustment += influence.score;
      evidence.push({
        text: `${division ?? 'D1'}: ${other} ${kind} ${name}${kind === 'aspects' ? ` by its ${ordinal(distance)} aspect from house ${sourceHouse}${mutual ? ` (mutual aspect: ${name} returns its ${ordinal(returnDistance)} aspect to ${other})` : ''}` : ''}; ${influence.description}${dignityStatus(ctx, name, division) === 'Debilitated' && influence.score > 0 ? '; this mitigates the receiver\'s debility without erasing it' : ''}.`,
        tone: influence.score > 1 ? 'good' : influence.score < -1 ? 'bad' : 'neutral',
      });
    }
  }
  return { score: Math.max(-9, Math.min(6, adjustment)), evidence };
}

const STATUS_POINTS: Record<string, number> = {
  Exalted: 9, Own: 8, 'Adhi Mitra': 5, Mitra: 3, Sama: 0, Shatru: -4, 'Adhi Shatru': -7, Debilitated: -9, Node: 0,
};
export const STATUS_TEXT: Record<string, string> = {
  Exalted: 'exalted', Own: 'in its own sign', 'Adhi Mitra': 'in a very friendly sign', Mitra: 'in a friendly sign',
  Sama: 'in a neutral sign', Shatru: 'in an enemy sign', 'Adhi Shatru': 'in a very hostile sign', Debilitated: 'debilitated', Node: 'placed',
};

function assessOccupant(ctx: Context, name: string, house: number, upachaya: boolean, division?: string): Assessment {
  if (['Rahu', 'Ketu'].includes(name)) return assessNode(ctx, name, division);
  const nature = functionalNature(ctx, name);
  const naturalMalefic = MALEFICS.includes(name);
  const position = planet(ctx, name);
  const status = division ? vargaStatus(ctx, name, division)
    : position.dignity === 'DEBILITATED' ? 'Debilitated' : position.dignity === 'EXALTED' ? 'Exalted'
      : position.dignity === 'OWN' ? 'Own' : ['Rahu', 'Ketu'].includes(name) ? 'Node' : signStatus(position, ctx.relations)?.compound ?? 'Sama';
  const constructiveDrive = upachaya && naturalMalefic && name !== 'Ketu';
  const mixed = naturalMalefic && ['benefic', 'yogakaraka'].includes(nature)
    || !naturalMalefic && nature === 'malefic';
  const pressure = naturalMalefic || nature === 'malefic';
  const points = constructiveDrive ? 3 : mixed ? -1 : pressure ? -5 : 6;
  const dignityPoints = STATUS_POINTS[status] <= -4 ? -2 : STATUS_POINTS[status] >= 8 ? 2 : 0;
  const tone = points + dignityPoints > 1 ? 'good' : points + dignityPoints < -1 ? 'bad' : 'neutral';
  return {
    score: points + dignityPoints,
    evidence: [{
      text: `${division ?? 'D1'}: ${name} occupies the ${ordinal(house)} house; ${STATUS_TEXT[status]}, naturally ${naturalMalefic ? 'malefic' : 'benefic'}, functionally ${nature} in D1. ${constructiveDrive ? 'This can give drive through sustained effort, not effortless ease.' : mixed ? 'Its natural and functional roles give mixed support and pressure.' : pressure ? 'This adds friction.' : 'This provides support.'} Placement comfort: ${placementComfort(house, status, naturalMalefic)}.`,
      tone,
    }],
  };
}

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
  const nature = functionalNature(ctx, lordName);
  const owned = housesRuledBy(ctx, lordName);
  const naturePoints = nature === 'yogakaraka' ? 5 : nature === 'benefic' ? 3 : nature === 'malefic' ? -3 : 0;
  score += naturePoints;
  evidence.push({
    text: `${tag}: ${lordName} rules D1 houses ${owned.join(', ')} and is functionally ${nature} for this Ascendant.`,
    tone: naturePoints > 0 ? 'good' : naturePoints < 0 ? 'bad' : 'neutral',
  });

  if (GOOD_HOUSES.includes(lordHouse)) {
    score += 8;
    evidence.push({ text: `${tag}: the ${ordinal(house)} lord ${lordName} sits in the ${ordinal(lordHouse)} house, a supportive placement.`, tone: 'good' });
  } else if (DUSTHANA.includes(lordHouse)) {
    score -= 10;
    evidence.push({ text: `${tag}: the ${ordinal(house)} lord ${lordName} falls in the ${ordinal(lordHouse)} house, a difficult placement.`, tone: 'bad' });
  }

  const status = vargaStatus(ctx, lordName, division);
  const relativeHouse = ((lordHouse - house + 12) % 12) + 1;
  if (DUSTHANA.includes(relativeHouse)) score -= 4;
  evidence.push({
    text: `${tag}: the ${ordinal(house)} lord ${lordName} is ${ordinal(relativeHouse)} from its own ${ordinal(house)} house; ${placementComfort(lordHouse, status, MALEFICS.includes(lordName))}${DUSTHANA.includes(relativeHouse) ? '; the 6/8/12 relationship to its governed house adds a separate caution' : ''}.`,
    tone: DUSTHANA.includes(relativeHouse) || DUSTHANA.includes(lordHouse) || STATUS_POINTS[status] < 0 ? 'bad' : STATUS_POINTS[status] > 0 ? 'good' : 'neutral',
  });
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
    const occupant = assessOccupant(ctx, name, house, upachaya, division);
    score += occupant.score;
    evidence.push(...occupant.evidence);
  }

  const before = house === 1 ? 12 : house - 1;
  const after = house === 12 ? 1 : house + 1;
  const flanking = [...vargaOccupants(ctx, division, before), ...vargaOccupants(ctx, division, after)];
  const leftMalefics = vargaOccupants(ctx, division, before).filter((n) => MALEFICS.includes(n));
  const rightMalefics = vargaOccupants(ctx, division, after).filter((n) => MALEFICS.includes(n));
  const leftBenefics = vargaOccupants(ctx, division, before).filter((n) => BENEFICS.includes(n as typeof BENEFICS[number]));
  const rightBenefics = vargaOccupants(ctx, division, after).filter((n) => BENEFICS.includes(n as typeof BENEFICS[number]));
  if (leftMalefics.length && rightMalefics.length) {
    score -= 7;
    evidence.push({ text: `${tag}: Paap Kartari hems this house between ${leftMalefics.join(', ')} and ${rightMalefics.join(', ')}.`, tone: 'bad' });
  } else if (leftBenefics.length && rightBenefics.length) {
    score += 7;
    evidence.push({ text: `${tag}: Subha Kartari protects this house between ${leftBenefics.join(', ')} and ${rightBenefics.join(', ')}.`, tone: 'good' });
  } else if (flanking.length) {
    evidence.push({ text: `${tag}: flanking signs have ${flanking.join(', ')}, but do not form a complete Kartari enclosure.`, tone: 'neutral' });
  } else {
    evidence.push({ text: `${tag}: no complete Paap Kartari or Subha Kartari enclosure; both adjacent houses are unoccupied.`, tone: 'neutral' });
  }

  for (const name of vargaAspectors(ctx, division, house)) {
    const influence = influenceQuality(ctx, name, division);
    score += influence.score;
    const sourceHouse = vargaHouseOf(ctx, name, division);
    const distance = ((house - sourceHouse + 12) % 12) + 1;
    evidence.push({
      text: `${tag}: ${name} aspects the ${ordinal(house)} house by its ${ordinal(distance)} aspect from house ${sourceHouse}; ${influence.description}.`,
      tone: influence.score > 1 ? 'good' : influence.score < -1 ? 'bad' : 'neutral',
    });
  }

  if (karaka) {
    const k = vargaStatus(ctx, karaka, division);
    const karakaHouse = vargaHouseOf(ctx, karaka, division);
    if (DUSTHANA.includes(karakaHouse) && !DUSTHANA.includes(house)) {
      score -= 6;
      evidence.push({ text: `${tag}: ${karaka}, the natural significator, occupies the ${ordinal(karakaHouse)} house; this needs care despite ${STATUS_TEXT[k]} dignity.`, tone: 'bad' });
    }
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
  for (const name of new Set([lordName, ...(karaka ? [karaka] : [])])) {
    const influences = assessPlanetInfluences(ctx, name, division);
    if (vargaHouseOf(ctx, name, division) !== house) score += influences.score;
    evidence.push(...influences.evidence);
  }
  for (const name of vargaOccupants(ctx, division, house).filter((occupant) => occupant !== lordName && occupant !== karaka)) {
    evidence.push(...assessPlanetInfluences(ctx, name, division).evidence);
  }
  const uniqueEvidence = [...new Map(evidence.map((item) => [item.text, item])).values()];
  return { score: Math.max(5, Math.min(95, Math.round(score))), evidence: uniqueEvidence };
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
  const nature = functionalNature(ctx, lordName);
  const owned = housesRuledBy(ctx, lordName);

  const relativeHouse = ((lord.house - house + 12) % 12) + 1;
  if (DUSTHANA.includes(relativeHouse)) score -= 4;
  const status = lord.dignity === 'DEBILITATED' ? 'Debilitated' : lord.dignity === 'EXALTED' ? 'Exalted'
    : lord.dignity === 'OWN' ? 'Own' : signStatus(lord, ctx.relations)?.compound ?? 'Sama';
  evidence.push({
    text: `${label} is ${ordinal(relativeHouse)} from the house it rules; ${placementComfort(lord.house, status, MALEFICS.includes(lordName))}${DUSTHANA.includes(relativeHouse) ? '; a 6/8/12 relationship to its governed house adds a separate caution' : ''}.`,
    tone: DUSTHANA.includes(relativeHouse) || DUSTHANA.includes(lord.house) || STATUS_POINTS[status] < 0 ? 'bad' : STATUS_POINTS[status] > 0 ? 'good' : 'neutral',
  });

  if (GOOD_HOUSES.includes(lord.house)) {
    score += 8;
    evidence.push({ text: `${label} is well placed in the ${ordinal(lord.house)} house.`, tone: 'good' });
  } else if (DUSTHANA.includes(lord.house)) {
    score -= 10;
    evidence.push({ text: `${label} falls in the ${ordinal(lord.house)} house, a difficult placement.`, tone: 'bad' });
  } else {
    evidence.push({ text: `${label} is in the ${ordinal(lord.house)} house.`, tone: 'neutral' });
  }

  const naturePoints = nature === 'yogakaraka' ? 6 : nature === 'benefic' ? 4 : nature === 'malefic' ? -4 : 0;
  score += naturePoints;
  evidence.push({
    text: `${lordName} rules houses ${owned.join(', ')} from this Ascendant and is functionally ${nature}.`,
    tone: naturePoints > 0 ? 'good' : naturePoints < 0 ? 'bad' : 'neutral',
  });

  if (lord.dignity === 'EXALTED' || lord.dignity === 'OWN') {
    score += lord.dignity === 'EXALTED' ? 10 : 8;
    evidence.push({ text: `${lordName} is ${lord.dignity === 'EXALTED' ? 'exalted' : 'in its own sign'}.`, tone: 'good' });
  } else if (lord.dignity === 'DEBILITATED') {
    const cancelled = hasNeechaBhanga(ctx, lordName);
    score -= cancelled ? 6 : 10;
    evidence.push({
      text: cancelled ? `${lordName} is debilitated with Neecha Bhanga factors; these mitigate weakness rather than erase it or guarantee a strong outcome.` : `${lordName} is debilitated.`,
      tone: 'bad',
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
    const occupant = assessOccupant(ctx, name, house, upachaya);
    score += occupant.score;
    evidence.push(...occupant.evidence);
  }
  const kartari = houseKartari(ctx, house);
  if (kartari?.kind === 'Paap Kartari') {
    score -= 8;
    evidence.push({ text: `${kartari.kind}: ${ordinal(house)} house is hemmed by ${kartari.planets.join(', ')}, adding pressure to this life area.`, tone: 'bad' });
  } else if (kartari?.kind === 'Subha Kartari') {
    score += 8;
    evidence.push({ text: `${kartari.kind}: ${ordinal(house)} house is flanked by ${kartari.planets.join(', ')}, offering protection and support.`, tone: 'good' });
  } else if (kartari?.kind === 'None') {
    evidence.push({ text: `No complete Paap Kartari or Subha Kartari encloses the ${ordinal(house)} house.`, tone: 'neutral' });
  }
  for (const name of aspectors(ctx, house)) {
    const influence = influenceQuality(ctx, name);
    const sourceHouse = planet(ctx, name).house;
    const distance = ((house - sourceHouse + 12) % 12) + 1;
    score += upachaya && influence.score < 0 ? Math.max(-1, influence.score) : influence.score;
    evidence.push({
      text: `D1: ${name} aspects the ${ordinal(house)} house by its ${ordinal(distance)} aspect from house ${sourceHouse}; ${influence.description}.`,
      tone: influence.score > 1 ? 'good' : influence.score < -1 ? 'bad' : 'neutral',
    });
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

  for (const name of new Set([lordName, ...(karaka ? [karaka] : [])])) {
    const influences = assessPlanetInfluences(ctx, name);
    if (planet(ctx, name).house !== house) score += influences.score;
    evidence.push(...influences.evidence);
  }
  return { score: Math.max(5, Math.min(95, score)), evidence };
}
