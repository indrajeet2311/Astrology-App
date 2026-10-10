import { useMemo, useState } from 'react';
import { AV_PLANETS, ashtakavarga } from '../ashtakavarga';
import { SIGN_ABBR, SIGN_GLYPHS } from '../constants';
import type { Chart } from '../types';
import { AshtakavargaChart } from './AshtakavargaChart';

type View = 'Sarva' | (typeof AV_PLANETS)[number];

export function AshtakavargaCard({ chart }: { chart: Chart }) {
  const av = useMemo(() => ashtakavarga(chart), [chart]);
  const [view, setView] = useState<View>('Sarva');
  const [style, setStyle] = useState<'north' | 'south'>('north');
  const lagna = chart.ascendant.signNumber - 1;
  const best = Math.max(...av.sarva);
  const worst = Math.min(...av.sarva);
  const shade = (v: number) => (v >= 6 ? 'av-high' : v <= 2 ? 'av-low' : '');
  const bindus = view === 'Sarva' ? av.sarva : av.planets[view];
  const total = bindus.reduce((a, b) => a + b, 0);
  const [high, low] = view === 'Sarva' ? [28, 25] : [5, 3];

  return (
    <section className="card">
      <div className="card-head">
        <h2>Ashtakavarga</h2>
        <div className="segmented no-print" role="group" aria-label="Ashtakavarga chart style">
          <button type="button" aria-pressed={style === 'north'} onClick={() => setStyle('north')}>North Indian</button>
          <button type="button" aria-pressed={style === 'south'} onClick={() => setStyle('south')}>South Indian</button>
        </div>
      </div>
      <p className="muted small">Benefic points (bindus) each planet earns in every sign. In the Sarvashtakavarga, signs with 28 or more support transits and results; fewer than 25 are weak.</p>

      <div className="segmented av-views no-print" role="group" aria-label="Ashtakavarga view">
        {(['Sarva', ...AV_PLANETS] as View[]).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
            {v === 'Sarva' ? 'Sarva (SAV)' : v}
          </button>
        ))}
      </div>
      <h3 className="av-title">{view === 'Sarva' ? 'Sarvashtakavarga' : `${view} Bhinnashtakavarga`} · {total} bindus</h3>
      <AshtakavargaChart
        bindus={bindus}
        ascSign={chart.ascendant.signNumber}
        style={style}
        label={view === 'Sarva' ? 'SAV' : `${view} BAV`}
        high={high}
        low={low}
      />
      <p className="muted small">
        {style === 'north' ? 'North Indian: house 1 is the top diamond; small numbers are signs, large numbers are bindus.' : 'South Indian: signs are fixed; the highlighted box holds the Ascendant.'}
      </p>

      <div className="table-wrap">
        <table className="av-table">
          <thead>
            <tr>
              <th scope="col">Planet</th>
              {SIGN_ABBR.map((s, i) => (
                <th key={s} scope="col" className={i === lagna ? 'av-lagna' : ''}>
                  <span className="glyph" aria-hidden>{SIGN_GLYPHS[i]}</span> {s}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {AV_PLANETS.map((name) => {
              const row = av.planets[name];
              return (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  {row.map((v, i) => <td key={i} className={`num ${shade(v)}`}>{v}</td>)}
                  <td className="num"><strong>{row.reduce((a, b) => a + b, 0)}</strong></td>
                </tr>
              );
            })}
            <tr className="av-sarva">
              <th scope="row">Sarva</th>
              {av.sarva.map((v, i) => (
                <td key={i} className={`num ${v >= 28 ? 'av-high' : v < 25 ? 'av-low' : ''}`}><strong>{v}</strong></td>
              ))}
              <td className="num"><strong>{av.sarva.reduce((a, b) => a + b, 0)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Strongest sign: {SIGN_ABBR[av.sarva.indexOf(best)]} ({best}). Weakest sign: {SIGN_ABBR[av.sarva.indexOf(worst)]} ({worst}).
      </p>
    </section>
  );
}
