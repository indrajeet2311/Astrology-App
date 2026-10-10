import { useMemo, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { errorMessage, loadFestivalCalendar } from '../api';
import { AYANAMSA_OPTIONS } from '../constants';
import type { FestivalCalendar, FestivalCategory } from '../timelineTypes';
import type { Ayanamsa, Place } from '../types';
import { PlaceSearch } from './PlaceSearch';

const CATEGORIES: { id: FestivalCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'FESTIVAL', label: 'Festivals' },
  { id: 'EKADASHI', label: 'Ekadashi' },
  { id: 'PURNIMA', label: 'Purnima' },
  { id: 'AMAVASYA', label: 'Amavasya' },
  { id: 'PRADOSH', label: 'Pradosh' },
  { id: 'SANKASHTI', label: 'Sankashti' },
  { id: 'SANKRANTI', label: 'Sankranti' },
];

export function FestivalCalendarCard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [place, setPlace] = useState<Place | null>(null);
  const [ayanamsa, setAyanamsa] = useState<Ayanamsa>('LAHIRI');
  const [category, setCategory] = useState<FestivalCategory | 'ALL'>('FESTIVAL');
  const [calendar, setCalendar] = useState<FestivalCalendar | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!place) {
      setError('Search and choose a location first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      setCalendar(await loadFestivalCalendar({ year, placeName: place.placeName, latitude: place.latitude,
        longitude: place.longitude, timeZone: place.timeZone, ayanamsa }));
    } catch (e) {
      setError(errorMessage(e, 'Could not calculate the calendar.'));
      setCalendar(null);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const groups = new Map<string, FestivalCalendar['events']>();
    for (const e of calendar?.events ?? []) {
      if (category !== 'ALL' && e.category !== category) continue;
      const key = e.date.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()];
  }, [calendar, category]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="card">
      <h2>Festival and Ekadashi calendar</h2>
      <p className="muted small">Tithi-based festivals, Ekadashi, Purnima, Amavasya and Sankranti for a full year at your location. Lunar months run new moon to new moon.</p>
      <div className="daily-panchang-controls">
        <div className="field">
          <label htmlFor="fest-year">Year</label>
          <input id="fest-year" type="number" min="1900" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div className="field">
          <span className="label">Location</span>
          <PlaceSearch selected={place} onSelect={(value) => { setPlace(value); setError(''); }} />
        </div>
        <div className="field">
          <label htmlFor="fest-ayanamsa">Ayanamsa</label>
          <select id="fest-ayanamsa" value={ayanamsa} onChange={(e) => setAyanamsa(e.target.value as Ayanamsa)}>
            {AYANAMSA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button type="button" className="button-primary" disabled={loading || !year} onClick={() => void load()}>
          {loading ? <Loader2 className="spin" size={18} /> : <CalendarDays size={18} />}
          {loading ? 'Calculating…' : 'Show calendar'}
        </button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {calendar && (
        <div aria-live="polite">
          <div className="segmented cal-filters" role="group" aria-label="Calendar filter">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</button>
            ))}
          </div>
          {grouped.length === 0 && <p className="muted">Nothing in this category.</p>}
          {grouped.map(([month, items]) => (
            <div key={month} className="cal-month">
              <h3>{new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <ul className="cal-list">
                {items.map((e, i) => (
                  <li key={`${e.date}-${e.name}-${i}`} className={`cal-item cal-${e.category.toLowerCase()} ${e.date === today ? 'cal-today' : ''}`}>
                    <span className="cal-date">{new Date(`${e.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span><strong>{e.name}</strong><small className="muted"> · {e.detail}</small></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="muted small">
            Lunar months this year: {calendar.months.map((m) => `${m.adhika ? 'Adhika ' : ''}${m.name}`).join(', ')}.
            Dates follow the tithi at sunrise, midday, sunset or midnight as each observance requires; regional traditions and exact observance times can differ by a day.
          </p>
        </div>
      )}
    </section>
  );
}
