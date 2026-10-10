import type { Chart, Position } from './types';
import { SIGN_NAMES } from './constants';

/** Recounts whole-sign houses from a selected sign for inspection; natal placements remain unchanged. */
export function chartFromAscendantSign(chart: Chart, ascendantSign: number): Chart {
  const toHouse = (signNumber: number) => 1 + ((signNumber - ascendantSign + 12) % 12);
  const ascendant: Position = {
    ...chart.ascendant,
    signNumber: ascendantSign,
    sign: SIGN_NAMES[ascendantSign - 1],
    house: 1,
    longitude: (ascendantSign - 1) * 30 + chart.ascendant.degreeInSign,
  };
  return { ...chart, ascendant, planets: chart.planets.map((p) => ({ ...p, house: toHouse(p.signNumber) })) };
}

/** Re-expresses a chart in a divisional sign set so the D1 renderers can draw it. */
export function divisionalChart(chart: Chart, division: string): Chart {
  const ascSign = chart.ascendant.divisionalSigns[division] ?? chart.ascendant.signNumber;
  const convert = (p: Position): Position => ({
    ...p,
    signNumber: p.divisionalSigns[division] ?? p.signNumber,
    sign: SIGN_NAMES[(p.divisionalSigns[division] ?? p.signNumber) - 1],
    house: 1 + (((p.divisionalSigns[division] ?? p.signNumber) - ascSign + 12) % 12),
  });
  return { ...chart, ascendant: convert(chart.ascendant), planets: chart.planets.map(convert) };
}
