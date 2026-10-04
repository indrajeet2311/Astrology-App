import { useMemo } from 'react';
import { AV_PLANETS, ashtakavarga } from '../ashtakavarga';
import { SIGN_ABBR, SIGN_GLYPHS } from '../constants';
import { planetStrengths } from '../strength';
import type { Chart } from '../types';

export function AshtakavargaCard({ chart }: { chart: Chart }) {
  const av = useMemo(() => ashtakavarga(chart), [chart]);
  const strengths = useMemo(() => planetStrengths(chart), [chart]);
  const lagna = chart.ascendant.signNumber - 1;
  const best = Math.max(...av.sarva);
  const worst = Math.min(...av.sarva);
  const shade = (v: number, avg: number) => (v >= avg + 2 ? 'av-high' : v <= avg - 2 ? 'av-low' : '');

  return (
    <>
      <section className="card">
        <h2>Ashtakavarga</h2>
        <p className="muted small">Benefic points (bindus) each planet earns in every sign. Signs with 28 or more in the total row support transits and results; fewer than 25 are weak.</p>
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
                const total = row.reduce((a, b) => a + b, 0);
                return (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    {row.map((v, i) => <td key={i} className={`num ${shade(v, 4)}`}>{v}</td>)}
                    <td className="num"><strong>{total}</strong></td>
                  </tr>
                );
              })}
              <tr className="av-sarva">
                <th scope="row">Sarva</th>
                {av.sarva.map((v, i) => (
                  <td key={i} className={`num ${v >= 28 ? 'av-high' : v < 25 ? 'av-low' : ''}`}>
                    <strong>{v}</strong>
                  </td>
                ))}
                <td className="num"><strong>{av.sarva.reduce((a, b) => a + b, 0)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Strongest sign: {SIGN_ABBR[av.sarva.indexOf(best)]} ({best}). Weakest sign: {SIGN_ABBR[av.sarva.indexOf(worst)]} ({worst}). The Ascendant sign is outlined.
        </p>
      </section>

      <section className="card">
        <h2>Planetary strength</h2>
        <p className="muted small">A simplified Shadbala: exaltation (Uchcha), directional (Dig), natural (Naisargika) and retrograde-based motional strength. Time-based Kala Bala and Drik Bala are not included, so this is a guide and not the full classical value.</p>
        <div className="strength-list">
          {strengths.map((s) => (
            <div className="strength-row" key={s.name}>
              <div className="strength-name">
                <strong>{s.name}</strong>
                <small className="muted">
                  {s.dignity ? s.dignity.toLowerCase() : 'neutral'}{s.combust ? ' · combust' : ''}
                </small>
              </div>
              <div className="strength-bar" role="img" aria-label={`${s.name} strength ${s.percent} percent`}>
                <span style={{ width: `${s.percent}%` }} />
              </div>
              <div className="strength-value num">{s.percent}%</div>
              <div className="strength-parts muted small">
                Uchcha {s.uchcha.toFixed(0)} · Dig {s.dig.toFixed(0)} · Natural {s.naisargika.toFixed(0)} · Motion {s.cheshta.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
