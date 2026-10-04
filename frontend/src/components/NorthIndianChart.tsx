import { bodyLabel, formatDegrees } from '../format';
import { SIGN_NAMES } from '../constants';
import type { Chart, Position } from '../types';

/** Stacks body labels two per row, centred on (x, y). */
export function BodyLabels({ bodies, x, y }: { bodies: Position[]; x: number; y: number }) {
  const rows: Position[][] = [];
  for (let i = 0; i < bodies.length; i += 2) rows.push(bodies.slice(i, i + 2));
  const lineHeight = 17;
  const top = y - ((rows.length - 1) * lineHeight) / 2;
  return (
    <text className="chart-body" textAnchor="middle" dominantBaseline="central">
      {rows.map((row, i) => (
        <tspan key={i} x={x} y={top + i * lineHeight}>
          {row.map((body, j) => (
            <tspan key={body.name}>
              <title>{`${body.name}: ${body.sign} ${formatDegrees(body.degreeInSign)}, ${body.nakshatra} pada ${body.pada}; house ${body.house}${body.retrograde ? '; retrograde' : ''}${body.dignity ? `; ${body.dignity.toLowerCase()}` : ''}${body.combust ? '; combust' : ''}${body.vargottama ? '; Vargottama' : ''}`}</title>
              {j > 0 ? ' ' : ''}{bodyLabel(body)}
            </tspan>
          ))}
        </tspan>
      ))}
    </text>
  );
}

// Houses run anticlockwise from the top diamond. `body` is where planets go, `sign` is the sign number.
export const HOUSES: { points: string; body: [number, number]; sign: [number, number] }[] = [
  { points: '200,0 300,100 200,200 100,100', body: [200, 92], sign: [200, 178] },
  { points: '0,0 200,0 100,100', body: [100, 36], sign: [100, 84] },
  { points: '0,0 100,100 0,200', body: [36, 100], sign: [80, 100] },
  { points: '0,200 100,100 200,200 100,300', body: [96, 200], sign: [166, 200] },
  { points: '0,200 100,300 0,400', body: [36, 300], sign: [80, 300] },
  { points: '0,400 100,300 200,400', body: [100, 364], sign: [100, 318] },
  { points: '200,400 100,300 200,200 300,300', body: [200, 308], sign: [200, 222] },
  { points: '200,400 300,300 400,400', body: [300, 364], sign: [300, 318] },
  { points: '400,400 300,300 400,200', body: [364, 300], sign: [320, 300] },
  { points: '400,200 300,300 200,200 300,100', body: [304, 200], sign: [234, 200] },
  { points: '400,200 300,100 400,0', body: [364, 100], sign: [320, 100] },
  { points: '400,0 300,100 200,0', body: [300, 36], sign: [300, 84] },
];

export function NorthIndianChart({ chart, label = 'Rashi · D1', onHouseSelect }: {
  chart: Chart;
  label?: string;
  onHouseSelect?: (signNumber: number) => void;
}) {
  const all = [chart.ascendant, ...chart.planets];
  return (
    <svg viewBox="0 0 400 400" className="chart-svg" role="img" aria-label={`North Indian style chart, ${label}`}>
      {HOUSES.map((h, i) => {
        const house = i + 1;
        const signNumber = ((chart.ascendant.signNumber - 1 + i) % 12) + 1;
        const select = () => onHouseSelect?.(signNumber);
        return (
          <g
            key={house}
            role={onHouseSelect ? 'button' : undefined}
            tabIndex={onHouseSelect ? 0 : undefined}
            aria-label={onHouseSelect ? `View from house ${house}, ${SIGN_NAMES[signNumber - 1]}` : undefined}
            onClick={onHouseSelect ? select : undefined}
            onKeyDown={onHouseSelect ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
            } : undefined}
          >
            <polygon
              points={h.points}
              className={`${house === 1 ? 'chart-house is-asc' : 'chart-house'}${onHouseSelect ? ' chart-house-interactive' : ''}`}
            />
            <text className="chart-sign" x={h.sign[0]} y={h.sign[1]} textAnchor="middle" dominantBaseline="central">
              {signNumber}
            </text>
            <BodyLabels bodies={all.filter((p) => p.house === house)} x={h.body[0]} y={h.body[1]} />
          </g>
        );
      })}
    </svg>
  );
}
