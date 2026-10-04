import { SIGN_ABBR } from '../constants';
import { HOUSES } from './NorthIndianChart';
import { CELL, GRID } from './SouthIndianChart';

interface Props {
  /** Bindus per sign, index 0 = Aries. */
  bindus: number[];
  ascSign: number;
  style: 'north' | 'south';
  label: string;
  /** Bindu counts at or above this are drawn as strong, below `low` as weak. */
  high: number;
  low: number;
}

const tone = (v: number, high: number, low: number) => (v >= high ? 'av-num av-num-high' : v < low ? 'av-num av-num-low' : 'av-num');

export function AshtakavargaChart({ bindus, ascSign, style, label, high, low }: Props) {
  return (
    <svg viewBox="0 0 400 400" className="chart-svg" role="img" aria-label={`${style === 'north' ? 'North' : 'South'} Indian Ashtakavarga chart, ${label}`}>
      {style === 'north'
        ? HOUSES.map((h, i) => {
            const sign = ((ascSign - 1 + i) % 12) + 1;
            return (
              <g key={i}>
                <polygon points={h.points} className={i === 0 ? 'chart-house is-asc' : 'chart-house'} />
                <text className="chart-sign" x={h.sign[0]} y={h.sign[1]} textAnchor="middle" dominantBaseline="central">{sign}</text>
                <text className={tone(bindus[sign - 1], high, low)} x={h.body[0]} y={h.body[1]} textAnchor="middle" dominantBaseline="central">
                  {bindus[sign - 1]}
                </text>
              </g>
            );
          })
        : (
          <>
            {GRID.map(([col, row], sign) => {
              const x = col * CELL;
              const y = row * CELL;
              return (
                <g key={sign}>
                  <rect x={x} y={y} width={CELL} height={CELL} className={ascSign === sign + 1 ? 'chart-house is-asc' : 'chart-house'} />
                  <text className="chart-sign" x={x + 8} y={y + 14}>{SIGN_ABBR[sign]}</text>
                  <text className={tone(bindus[sign], high, low)} x={x + CELL / 2} y={y + CELL / 2 + 6} textAnchor="middle" dominantBaseline="central">
                    {bindus[sign]}
                  </text>
                </g>
              );
            })}
            <text className="chart-title" x={200} y={196} textAnchor="middle">{label}</text>
          </>
        )}
    </svg>
  );
}
