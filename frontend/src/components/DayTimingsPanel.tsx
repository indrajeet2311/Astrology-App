import { useState } from 'react';
import type { DayTimings, Slot } from '../dayTimings';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function SlotGrid({ slots, timeZone }: { slots: Slot[]; timeZone: string }) {
  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' });
  return (
    <div className="slot-grid">
      {slots.map((s, i) => (
        <div key={i} className={`slot slot-${s.tone ?? 'neutral'}`}>
          <strong>{s.label}</strong>
          <span className="muted small">{fmt(s.start)} – {fmt(s.end)}</span>
        </div>
      ))}
    </div>
  );
}

export function DayTimingsPanel({ timings, timeZone }: { timings: DayTimings; timeZone: string }) {
  const [part, setPart] = useState<'day' | 'night'>('day');
  const [kind, setKind] = useState<'choghadiya' | 'hora'>('choghadiya');
  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' });
  const range = (s: Slot) => `${fmt(s.start)} – ${fmt(s.end)}`;
  const slots = timings[kind][part];
  return (
    <div className="day-timings">
      <h3>Sun and inauspicious times · {WEEKDAYS[timings.weekday]}</h3>
      <div className="panchang">
        <div className="panchang-item"><span className="muted">Sunrise</span><strong>{fmt(timings.sunrise)}</strong></div>
        <div className="panchang-item"><span className="muted">Sunset</span><strong>{fmt(timings.sunset)}</strong></div>
        <div className="panchang-item slot-bad"><span className="muted">Rahu Kaal</span><strong>{range(timings.rahuKaal)}</strong></div>
        <div className="panchang-item slot-bad"><span className="muted">Yamaganda</span><strong>{range(timings.yamaganda)}</strong></div>
        <div className="panchang-item slot-bad"><span className="muted">Gulika Kaal</span><strong>{range(timings.gulika)}</strong></div>
        <div className="panchang-item slot-good"><span className="muted">Abhijit Muhurta</span><strong>{range(timings.abhijit)}</strong></div>
      </div>
      <div className="annual-toolbar">
        <div className="segmented" role="group" aria-label="Timing type">
          <button type="button" aria-pressed={kind === 'choghadiya'} onClick={() => setKind('choghadiya')}>Choghadiya</button>
          <button type="button" aria-pressed={kind === 'hora'} onClick={() => setKind('hora')}>Hora</button>
        </div>
        <div className="segmented" role="group" aria-label="Day or night">
          <button type="button" aria-pressed={part === 'day'} onClick={() => setPart('day')}>Day</button>
          <button type="button" aria-pressed={part === 'night'} onClick={() => setPart('night')}>Night</button>
        </div>
      </div>
      <SlotGrid slots={slots} timeZone={timeZone} />
      <p className="muted small">Computed from sunrise and sunset at the chosen location (no atmospheric refraction beyond the standard 0.833°). Times are in the location's timezone.</p>
    </div>
  );
}
