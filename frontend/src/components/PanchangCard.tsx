import type { Panchang, Position } from '../types';

export function PanchangCard({ panchang, moon }: { panchang: Panchang; moon?: Position }) {
  const items = [
    { label: 'Tithi', value: `${panchang.paksha} ${panchang.tithi}`, detail: `${panchang.tithiNumber} of 30` },
    { label: 'Vara', value: panchang.vara, detail: `Ruled by ${panchang.varaLord}` },
    { label: 'Nakshatra', value: moon?.nakshatra ?? '—', detail: moon ? `Pada ${moon.pada}` : '' },
    { label: 'Yoga', value: panchang.yoga, detail: 'Sun + Moon' },
    { label: 'Karana', value: panchang.karana, detail: 'Half tithi' },
  ];
  return (
    <section className="card">
      <h2>Panchang at birth</h2>
      <div className="panchang">
        {items.map((i) => (
          <div key={i.label} className="panchang-item">
            <span className="muted">{i.label}</span>
            <strong>{i.value}</strong>
            <small>{i.detail}</small>
          </div>
        ))}
      </div>
      <p className="muted small">
        Vara uses the civil birth date; the Vedic day properly begins at sunrise, so a birth before sunrise belongs to the
        previous vara.
      </p>
    </section>
  );
}
