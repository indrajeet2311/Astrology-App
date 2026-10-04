import { useMemo } from 'react';
import { avasthas, gandantas } from '../avasthas';
import type { Chart } from '../types';

export function AvasthaCard({ chart }: { chart: Chart }) {
  const states = useMemo(() => avasthas(chart), [chart]);
  const gandanta = useMemo(() => gandantas(chart), [chart]);
  return (
    <section className="card">
      <h2>Planetary states (Avasthas) and Gandanta</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Planet</th><th scope="col">Baladi (age)</th><th scope="col">Effect</th><th scope="col">Jagradadi (alertness)</th><th scope="col">Effect</th></tr>
          </thead>
          <tbody>
            {states.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.name}</th>
                <td>{s.baladi.state}</td>
                <td className="muted small">{s.baladi.effect}</td>
                <td>{s.jagradadi?.state ?? <span className="muted">—</span>}</td>
                <td className="muted small">{s.jagradadi?.effect ?? 'Not applied to the nodes.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Baladi divides each sign into five 6° portions (reversed in even signs). Jagradadi follows the planet's dignity in its sign.</p>

      <h3 className="av-title">Gandanta</h3>
      {gandanta.length === 0 ? (
        <p className="muted">No planet or the Ascendant lies in a Gandanta zone.</p>
      ) : (
        <ul className="yoga-list">
          {gandanta.map((g) => (
            <li key={g.name}>
              <strong>{g.name}: {g.severity} Gandanta</strong>
              <span className="muted">{g.distance.toFixed(2)}° from the {g.junction} junction.</span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Gandanta is the last 3°20′ of Cancer, Scorpio and Pisces and the first 3°20′ of Leo, Sagittarius and Aries. Severity rises toward the junction.</p>
    </section>
  );
}
