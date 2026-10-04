import { SIGN_ABBR } from '../constants';
import type { Chart } from '../types';
import { BodyLabels } from './NorthIndianChart';

// [column, row] of each sign (0 = Aries) in the fixed-sign South Indian layout.
const GRID: [number, number][] = [
  [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3],
  [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0],
];
const CELL = 100;

export function SouthIndianChart({ chart, label = 'Rashi · D1' }: { chart: Chart; label?: string }) {
  const all = [chart.ascendant, ...chart.planets];
  const title = chart.birthDetails.name ?? 'Rashi';
  return (
    <svg viewBox="0 0 400 400" className="chart-svg" role="img" aria-label={`South Indian style chart, ${label}`}>
      {GRID.map(([col, row], sign) => {
        const x = col * CELL;
        const y = row * CELL;
        const isAsc = chart.ascendant.signNumber === sign + 1;
        return (
          <g key={sign}>
            <rect x={x} y={y} width={CELL} height={CELL} className={isAsc ? 'chart-house is-asc' : 'chart-house'} />
            <text className="chart-sign" x={x + 8} y={y + 14}>
              {SIGN_ABBR[sign]}
            </text>
            <BodyLabels bodies={all.filter((p) => p.signNumber === sign + 1)} x={x + CELL / 2} y={y + CELL / 2 + 6} />
          </g>
        );
      })}
      <text className="chart-title" x={200} y={190} textAnchor="middle">
        {title}
      </text>
      <text className="chart-sign" x={200} y={214} textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}
