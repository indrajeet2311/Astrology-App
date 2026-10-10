import { useMemo } from 'react';
import { personality } from '../personality';
import type { Chart } from '../types';

export function PersonalityCard({ chart }: { chart: Chart }) {
  const p = useMemo(() => personality(chart), [chart]);

  const facets = [p.ascendant, p.moon, p.sun, p.atmakaraka, p.nakshatra];

  return (
    <section className="card">
      <h2>Personality wise</h2>
      <p className="muted">A snapshot of temperament and inner nature, built from your Ascendant, Moon, Sun, birth nakshatra and Atmakaraka.</p>

      <ul className="yoga-list">
        {facets.map((f) => (
          <li key={f.title}>
            <strong>{f.title} <span className="chip chip-neutral">{f.sign}</span></strong>
            <span className="muted">{f.text}</span>
          </li>
        ))}
      </ul>

      <div className="summary" aria-label="Element and modality balance">
        <div className="card summary-item">
          <span className="muted">Dominant element</span>
          <strong>{p.element.dominant}</strong>
          <small>{p.element.text}</small>
        </div>
        <div className="card summary-item">
          <span className="muted">Dominant modality</span>
          <strong>{p.modality.dominant}</strong>
          <small>{p.modality.text}</small>
        </div>
      </div>

      <h3>In short</h3>
      <ul className="yoga-list">
        {p.summary.map((line, i) => (
          <li key={i}><span className="muted">{line}</span></li>
        ))}
      </ul>

      <p className="muted small">
        Based on whole-sign placements of the Ascendant, Moon and Sun, the Moon's birth nakshatra, the Jaimini Atmakaraka
        (soul significator, the planet at the highest degree) and the elemental/modal balance of the seven classical
        planets plus the Ascendant. This is a broad temperament sketch, not a fixed or complete personality profile.
      </p>
    </section>
  );
}
