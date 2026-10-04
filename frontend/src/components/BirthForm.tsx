import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AYANAMSA_OPTIONS } from '../constants';
import { todayIso } from '../format';
import type { Ayanamsa, BirthPayload, Place } from '../types';
import { PlaceSearch } from './PlaceSearch';

interface Props {
  loading: boolean;
  error: string;
  onSubmit: (payload: BirthPayload) => void;
}

export function BirthForm({ loading, error, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [ayanamsa, setAyanamsa] = useState<Ayanamsa>('LAHIRI');
  const [placeMissing, setPlaceMissing] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!place) {
      setPlaceMissing(true);
      return;
    }
    onSubmit({
      name: name.trim(),
      date,
      time,
      placeName: place.placeName,
      latitude: place.latitude,
      longitude: place.longitude,
      timeZone: place.timeZone,
      ayanamsa,
    });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Birth details</h2>
      <p className="muted">Use the exact local time shown on the birth record. The timezone is applied automatically.</p>

      <div className="field">
        <label htmlFor="name">
          Name <span className="optional">(optional)</span>
        </label>
        <input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="date">Date of birth</label>
          <input id="date" type="date" required min="1800-01-01" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="time">Time of birth</label>
          <input id="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <span className="label">Birthplace</span>
        <PlaceSearch
          selected={place}
          onSelect={(p) => {
            setPlace(p);
            setPlaceMissing(false);
          }}
        />
        {placeMissing && !place && (
          <p className="hint hint-error" role="alert">
            Search and choose your birthplace from the list.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="ayanamsa">Ayanamsa</label>
        <select id="ayanamsa" value={ayanamsa} onChange={(e) => setAyanamsa(e.target.value as Ayanamsa)}>
          {AYANAMSA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="button-primary" disabled={loading}>
        {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
        {loading ? 'Calculating…' : 'Calculate birth chart'}
      </button>
    </form>
  );
}
