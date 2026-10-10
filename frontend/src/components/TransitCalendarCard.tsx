import { useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { errorMessage, loadTransitCalendar } from '../api';
import { todayIso } from '../format';
import { payloadFromChart } from '../savedCharts';
import type { CalendarEvent, TransitCalendar } from '../timelineTypes';
import type { Chart } from '../types';

type Filter = 'all' | 'major' | 'ingress' | 'station' | 'eclipse';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'major', label: 'Major' },
  { id: 'all', label: 'All' },
  { id: 'ingress', label: 'Ingresses' },
  { id: 'station', label: 'Retro / direct' },
  { id: 'eclipse', label: 'Eclipses' },
];
const SLOW = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];

function dashaAt(chart: Chart, date: string): string {
  const d = date.slice(0, 10);
  const md = chart.dashas.find((p) => p.start.slice(0, 10) <= d && d < p.end.slice(0, 10));
  if (!md) return '—';
  const ad = md.antardashas.find((p) => p.start.slice(0, 10) <= d && d < p.end.slice(0, 10));
  return ad ? `${md.lord} – ${ad.lord}` : md.lord;
}

function matches(e: CalendarEvent, filter: Filter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'ingress': return e.type === 'INGRESS';
    case 'station': return e.type === 'RETROGRADE' || e.type === 'DIRECT';
    case 'eclipse': return e.type === 'SOLAR_ECLIPSE' || e.type === 'LUNAR_ECLIPSE';
    default:
      return e.type.endsWith('ECLIPSE') || (e.type === 'INGRESS' && SLOW.includes(e.planet))
        || ((e.type === 'RETROGRADE' || e.type === 'DIRECT') && (e.planet === 'Jupiter' || e.planet === 'Saturn'));
  }
}

export function TransitCalendarCard({ chart }: { chart: Chart }) {
  const [from, setFrom] = useState(todayIso);
  const [calendar, setCalendar] = useState<TransitCalendar | null>(null);
  const [filter, setFilter] = useState<Filter>('major');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const zone = chart.birthDetails.timeZone;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCalendar(await loadTransitCalendar(payloadFromChart(chart), from));
    } catch (e) {
      setError(errorMessage(e, 'Could not load the transit calendar.'));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: zone });
  const monthOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', timeZone: zone });
  const events = useMemo(() => (calendar ? calendar.events.filter((e) => matches(e, filter)) : []), [calendar, filter]);

  return (
    <section className="card">
      <div className="transit-head">
        <div>
          <h2>Dasha and transit calendar</h2>
          <p className="muted small">The running dasha beside Jupiter, Saturn, Mars and the nodes for the next 12 months, with ingresses, stations and eclipses.</p>
        </div>
        <div className="transit-date-control no-print">
          <label htmlFor="cal-from">Start date</label>
          <input id="cal-from" type="date" min="1800-01-01" max="2099-12-31" value={from} onChange={(e) => setFrom(e.target.value)} />
          <button type="button" className="button-primary" disabled={loading || !from} onClick={() => void load()}>
            {loading ? <Loader2 className="spin" size={17} /> : <CalendarClock size={17} />}
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {calendar && (
        <div aria-live="polite">
          <h3 className="av-title">Month by month</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Dasha – Antardasha</th>
                  {calendar.months[0].planets.map((p) => <th key={p.name} scope="col">{p.name}</th>)}
                  <th scope="col">Events</th>
                </tr>
              </thead>
              <tbody>
                {calendar.months.map((m) => {
                  const key = m.date.slice(0, 7);
                  const inMonth = calendar.events.filter((e) => monthOf(e.at) === key && matches(e, 'major'));
                  return (
                    <tr key={m.date}>
                      <th scope="row">{new Date(`${m.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</th>
                      <td><strong>{dashaAt(chart, m.date)}</strong></td>
                      {m.planets.map((p) => (
                        <td key={p.name}>
                          {p.sign.slice(0, 3)} <span className="muted small">H{p.house}{p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu' ? ' ℞' : ''}</span>
                        </td>
                      ))}
                      <td className="small">{inMonth.length ? inMonth.map((e) => e.title).join('; ') : <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">H is the house from the natal Ascendant ({calendar.natalAscendantSign}); Moon-based houses are in the event list. Positions are at noon on the 1st of each month.</p>

          <div className="annual-toolbar no-print">
            <h3 className="av-title">Events</h3>
            <div className="segmented" role="group" aria-label="Event filter">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
              ))}
            </div>
          </div>
          <ul className="cal-list">
            {events.map((e, i) => (
              <li key={`${e.at}-${i}`} className={`cal-item cal-${e.type.toLowerCase()}`}>
                <span className="cal-date">{fmt(e.at)}</span>
                <span>
                  <strong>{e.title}</strong>
                  <small className="muted"> · house {e.house} from Lagna, {e.moonHouse} from Moon</small>
                  {e.detail && <small className="muted"> · {e.detail}</small>}
                </span>
              </li>
            ))}
            {events.length === 0 && <li className="muted">No events match this filter.</li>}
          </ul>
          <p className="muted small">Eclipses are flagged from the Moon's latitude at the new or full moon; local visibility is not computed.</p>
        </div>
      )}
    </section>
  );
}
