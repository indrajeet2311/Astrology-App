import { useMemo, useState } from 'react';
import { shadbala } from '../shadbala';
import { SCHEMES, vimshopaka, vimshopakaGrade } from '../vimshopaka';
import type { SchemeName } from '../vimshopaka';
import type { Chart } from '../types';

const f = (v: number) => v.toFixed(1);

export function ShadbalaCard({ chart }: { chart: Chart }) {
  const rows = useMemo(() => shadbala(chart), [chart]);
  return (
    <section className="card">
      <h2>Shadbala (six-fold strength)</h2>
      <p className="muted small">
        Calculated with JHora's conventions, in virupas (60 virupas = 1 rupa). The ratio compares each total with the planet's required minimum.
      </p>
      <div className="table-wrap">
        <table className="shadbala-table">
          <thead>
            <tr>
              <th scope="col">Planet</th>
              <th scope="col">Sthana</th>
              <th scope="col">Dig</th>
              <th scope="col">Kala</th>
              <th scope="col">Cheshta</th>
              <th scope="col">Naisargika</th>
              <th scope="col">Drik</th>
              <th scope="col">Total</th>
              <th scope="col">Rupas</th>
              <th scope="col">Required</th>
              <th scope="col">Ratio</th>
              <th scope="col">Rank</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <th scope="row">{r.name}</th>
                <td className="num">{f(r.sthana.total)}</td>
                <td className="num">{f(r.dig)}</td>
                <td className="num">{f(r.kala.total)}</td>
                <td className="num">{f(r.cheshta)}</td>
                <td className="num">{f(r.naisargika)}</td>
                <td className="num">{f(r.drik)}</td>
                <td className="num"><strong>{f(r.total)}</strong></td>
                <td className="num">{r.rupas.toFixed(2)}</td>
                <td className="num">{r.required.toFixed(1)}</td>
                <td className={`num ${r.ratio >= 1 ? 'av-high' : 'av-low'}`}><strong>{r.ratio.toFixed(2)}</strong></td>
                <td className="num">{r.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="strength-list">
        {rows.map((r) => (
          <div className="strength-row" key={r.name}>
            <div className="strength-name"><strong>{r.name}</strong></div>
            <div className="strength-bar" role="img" aria-label={`${r.name} Shadbala ratio ${r.ratio.toFixed(2)}`}>
              <span style={{ width: `${Math.min(100, (r.ratio / 2) * 100)}%` }} />
            </div>
            <div className="strength-value num">{r.ratio.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <details className="shadbala-details">
        <summary>Component breakdown and Ishta/Kashta</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Planet</th>
                <th scope="col">Uchcha</th>
                <th scope="col">Saptavargaja</th>
                <th scope="col">Ojayugma</th>
                <th scope="col">Kendradi</th>
                <th scope="col">Drekkana</th>
                <th scope="col">Nathonnata</th>
                <th scope="col">Paksha</th>
                <th scope="col">Tribhaga</th>
                <th scope="col">Vara</th>
                <th scope="col">Hora</th>
                <th scope="col">Ayana</th>
                <th scope="col">Ishta</th>
                <th scope="col">Kashta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td className="num">{f(r.sthana.uchcha)}</td>
                  <td className="num">{f(r.sthana.saptavargaja)}</td>
                  <td className="num">{f(r.sthana.ojayugma)}</td>
                  <td className="num">{f(r.sthana.kendradi)}</td>
                  <td className="num">{f(r.sthana.drekkana)}</td>
                  <td className="num">{f(r.kala.nathonnata)}</td>
                  <td className="num">{f(r.kala.paksha)}</td>
                  <td className="num">{f(r.kala.tribhaga)}</td>
                  <td className="num">{f(r.kala.vara)}</td>
                  <td className="num">{f(r.kala.hora)}</td>
                  <td className="num">{f(r.kala.ayana)}</td>
                  <td className="num">{f(r.ishta)}</td>
                  <td className="num">{f(r.kashta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="muted small">
        Method: Saptavargaja uses Rasi-chart friendships; Kala Bala includes Abda and Masa lords (B.V. Raman's ahargana) and 60-minute horas from sunrise; Drik Bala uses sphuta drishti. Sun and Moon Cheshta are shown for Ishta/Kashta but not added to the total. Yuddha Bala is not included, and Mercury/Venus Cheshta uses modern mean motions, so small differences from JHora can remain.
      </p>
    </section>
  );
}

export function VimshopakaCard({ chart }: { chart: Chart }) {
  const rows = useMemo(() => vimshopaka(chart), [chart]);
  const [scheme, setScheme] = useState<SchemeName>('Shodashavarga');
  const names = Object.keys(SCHEMES) as SchemeName[];
  return (
    <section className="card">
      <div className="card-head">
        <h2>Vimshopaka Bala</h2>
        <div className="segmented no-print" role="group" aria-label="Varga scheme">
          {names.map((n) => (
            <button key={n} type="button" aria-pressed={scheme === n} onClick={() => setScheme(n)}>{n}</button>
          ))}
        </div>
      </div>
      <p className="muted small">
        Strength out of 20 from the dignity of each planet across the divisional charts, weighted per Parashara. Scheme weights: {Object.entries(SCHEMES[scheme]).map(([d, w]) => `${d} ${w}`).join(' · ')}.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Planet</th>
              {names.map((n) => <th key={n} scope="col">{n}</th>)}
              <th scope="col">Grade ({scheme})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const grade = vimshopakaGrade(r.scores[scheme]);
              return (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  {names.map((n) => (
                    <td key={n} className={`num ${n === scheme ? 'av-sel' : ''}`}>{r.scores[n].toFixed(2)}</td>
                  ))}
                  <td className={grade.tone === 'good' ? 'av-high' : grade.tone === 'bad' ? 'av-low' : ''}>{grade.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="shadbala-details">
        <summary>Dignity in each divisional chart</summary>
        <div className="table-wrap">
          <table className="av-table">
            <thead>
              <tr>
                <th scope="col">Planet</th>
                {Object.keys(SCHEMES.Shodashavarga).map((d) => <th key={d} scope="col">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  {r.placements.map((p) => (
                    <td key={p.division} title={`${p.status} · ${p.points} points`} className={p.points >= 18 ? 'av-high' : p.points <= 7 ? 'av-low' : ''}>
                      {p.status === 'Own' ? 'Own' : p.status === 'Adhi Mitra' ? 'AMi' : p.status === 'Adhi Shatru' ? 'ASh' : p.status.slice(0, 3)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">JHora convention: own 20 · great friend 18 · friend 15 · neutral 10 · enemy 7 · great enemy 5, using the five-fold friendship within each divisional chart. Exaltation and debilitation are not scored separately.</p>
      </details>
    </section>
  );
}
