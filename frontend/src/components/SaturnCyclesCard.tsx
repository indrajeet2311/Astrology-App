import { useState } from 'react';
import { Loader2, Hourglass } from 'lucide-react';
import { errorMessage, loadSaturnCycles } from '../api';
import { formatDate } from '../format';
import { payloadFromChart } from '../savedCharts';
import type { SaturnCycles, SaturnPeriod } from '../timelineTypes';
import type { Chart } from '../types';

const DAY = 86_400_000;

function tone(p: SaturnPeriod): string {
  if (p.kind === 'Dhaiya') return 'cycle-dhaiya';
  return p.phase === 'Peak' ? 'cycle-peak' : p.phase === 'Rising' ? 'cycle-rising' : 'cycle-setting';
}

export function SaturnCyclesCard({ chart }: { chart: Chart }) {
  const [cycles, setCycles] = useState<SaturnCycles | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const birth = chart.birthDetails.date;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCycles(await loadSaturnCycles(payloadFromChart(chart)));
    } catch (e) {
      setError(errorMessage(e, 'Could not load the Saturn cycles.'));
    } finally {
      setLoading(false);
    }
  };

  const start = new Date(birth).getTime();
  const end = cycles && cycles.periods.length ? new Date(cycles.periods[cycles.periods.length - 1].end).getTime() : start + 1;
  const span = Math.max(DAY, end - start);
  const pos = (iso: string) => `${Math.min(100, Math.max(0, ((new Date(iso).getTime() - start) / span) * 100))}%`;
  const age = (iso: string) => Math.max(0, Math.round(((new Date(iso).getTime() - start) / (365.25 * DAY)) * 10) / 10);
  const nowPct = Math.min(100, Math.max(0, ((Date.now() - start) / span) * 100));

  return (
    <section className="card">
      <div className="transit-head">
        <div>
          <h2>Sade Sati and Dhaiya history</h2>
          <p className="muted small">Saturn's passage over the 12th, 1st and 2nd signs from your Moon (Sade Sati) and the 4th and 8th (Dhaiya), across your lifetime.</p>
        </div>
        <button type="button" className="button-primary no-print" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 className="spin" size={17} /> : <Hourglass size={17} />}
          {loading ? 'Calculating…' : cycles ? 'Recalculate' : 'Show Saturn cycles'}
        </button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {cycles && (
        <div aria-live="polite">
          <p className="muted small">Moon sign: {cycles.moonSign} · Saturn is now in {cycles.currentSaturnSign}.</p>
          <div className="cycle-bar" role="img" aria-label="Timeline of Sade Sati and Dhaiya periods">
            {cycles.periods.map((p, i) => (
              <span
                key={i}
                className={`cycle-seg ${tone(p)}`}
                style={{ left: pos(p.start), width: `calc(${pos(p.end)} - ${pos(p.start)})` }}
                title={`${p.kind} · ${p.phase} · ${p.start} to ${p.end}`}
              />
            ))}
            <span className="cycle-now" style={{ left: `${nowPct}%` }} title="Today" />
          </div>
          <div className="cycle-legend small muted">
            <span><i className="cycle-rising" /> Rising</span>
            <span><i className="cycle-peak" /> Peak</span>
            <span><i className="cycle-setting" /> Setting</span>
            <span><i className="cycle-dhaiya" /> Dhaiya</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th scope="col">Cycle</th><th scope="col">Phase</th><th scope="col">Saturn in</th><th scope="col">From</th><th scope="col">To</th><th scope="col">Age</th></tr>
              </thead>
              <tbody>
                {cycles.periods.map((p, i) => (
                  <tr key={i} className={p.current ? 'row-current' : ''}>
                    <th scope="row">{p.kind}{p.current && <span className="badge-now"> now</span>}</th>
                    <td>{p.phase}</td>
                    <td>{p.sign}</td>
                    <td>{formatDate(p.start)}</td>
                    <td>{formatDate(p.end)}</td>
                    <td className="num">{age(p.start)}–{age(p.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Saturn can move back into a sign while retrograde, so a phase may appear twice. Dates are in the birth timezone.</p>
        </div>
      )}
    </section>
  );
}
