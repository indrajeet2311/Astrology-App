import type { Chart, Position } from './types';
import { SIGN_NAMES } from './constants';

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
