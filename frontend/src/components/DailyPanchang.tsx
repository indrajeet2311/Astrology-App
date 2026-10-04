import { useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { calculatePanchang, errorMessage } from '../api';
import { AYANAMSA_OPTIONS } from '../constants';
import { todayIso } from '../format';
import type { Ayanamsa, DailyPanchang as DailyPanchangResult, Place } from '../types';
import { PlaceSearch } from './PlaceSearch';
import { DayTimingsPanel } from './DayTimingsPanel';
import { dayTimings } from '../dayTimings';
import type { DayTimings } from '../dayTimings';

export function DailyPanchang() {
  const [date, setDate] = useState(todayIso);
  const [place, setPlace] = useState<Place | null>(null);
  const [ayanamsa, setAyanamsa] = useState<Ayanamsa>('LAHIRI');
  const [result, setResult] = useState<DailyPanchangResult | null>(null);
  const [timings, setTimings] = useState<{ data: DayTimings | null; timeZone: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async () => {
    if (!place) {
      setError('Search and choose a location first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      setResult(await calculatePanchang({ date, placeName: place.placeName, latitude: place.latitude,
        longitude: place.longitude, timeZone: place.timeZone, ayanamsa }));
      setTimings({ data: dayTimings(date, place.latitude, place.longitude), timeZone: place.timeZone });
    } catch (e) {
      setError(errorMessage(e, 'Could not calculate the Panchang.'));
      setResult(null);
      setTimings(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card daily-panchang">
      <h2>Daily Panchang</h2>
      <p className="muted small">Five limbs for the selected date and location.</p>
      <div className="daily-panchang-controls">
        <div className="field">
          <label htmlFor="panchang-date">Date</label>
          <input id="panchang-date" type="date" min="1800-01-01" max="2100-12-31" required value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field">
          <span className="label">Location</span>
          <PlaceSearch selected={place} onSelect={(value) => { setPlace(value); setError(''); }} />
        </div>
        <div className="field">
          <label htmlFor="daily-panchang-ayanamsa">Ayanamsa</label>
          <select id="daily-panchang-ayanamsa" value={ayanamsa} onChange={(event) => setAyanamsa(event.target.value as Ayanamsa)}>
            {AYANAMSA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <button type="button" className="button-primary" disabled={loading || !date} onClick={() => void lookup()}>
          {loading ? <Loader2 className="spin" size={18} /> : <CalendarDays size={18} />}
          {loading ? 'Calculating…' : 'Calculate Panchang'}
        </button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {result && (
        <div className="daily-panchang-result" aria-live="polite">
          <p className="muted small">{place?.placeName} · Moon in {result.moon.nakshatra}, pada {result.moon.pada}</p>
          <div className="panchang">
            <div className="panchang-item"><span className="muted">Tithi</span><strong>{result.panchang.paksha} {result.panchang.tithi}</strong></div>
            <div className="panchang-item"><span className="muted">Vara</span><strong>{result.panchang.vara}</strong><small>{result.panchang.varaLord}</small></div>
            <div className="panchang-item"><span className="muted">Nakshatra</span><strong>{result.moon.nakshatra}</strong><small>Pada {result.moon.pada}</small></div>
            <div className="panchang-item"><span className="muted">Yoga</span><strong>{result.panchang.yoga}</strong></div>
            <div className="panchang-item"><span className="muted">Karana</span><strong>{result.panchang.karana}</strong></div>
          </div>
          <p className="muted small">Calculated at local noon. Vara uses the civil date; sunrise-aware vara is not included.</p>
          {timings?.data
            ? <DayTimingsPanel timings={timings.data} timeZone={timings.timeZone} />
            : timings && <p className="muted small">No sunrise or sunset at this location on this date.</p>}
        </div>
      )}
    </section>
  );
}