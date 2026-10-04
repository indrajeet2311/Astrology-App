import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AYANAMSA_OPTIONS } from '../constants';
import { todayIso } from '../format';
import type { Ayanamsa, BirthPayload, HouseSystem, Place } from '../types';
import { PlaceSearch } from './PlaceSearch';
import { wallTimeChoices } from '../timezoneChoice';

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
  const [trueNode, setTrueNode] = useState(false);
  const [houseSystem, setHouseSystem] = useState<HouseSystem>('WHOLE_SIGN');
  const [placeMissing, setPlaceMissing] = useState(false);
  const [laterOccurrence, setLaterOccurrence] = useState(false);
  const timeChoices = useMemo(() => place && date && time ? wallTimeChoices(date, time, place.timeZone) : [], [place, date, time]);
  const skippedByClockChange = Boolean(place && date && time && timeChoices.length === 0);

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
      trueNode,
      houseSystem,
      laterOffset: timeChoices.length > 1 && laterOccurrence,
    });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Your birth details</h2>
      <p className="muted">Enter the date, time and place of birth. If you have a birth certificate, use the exact time on it. We work out the timezone for you.</p>

      <div className="field">
        <label htmlFor="name">
          Name <span className="optional">(optional)</span>
        </label>
        <input id="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="date">Date of birth</label>
          <input id="date" type="date" required min="1800-01-01" max={todayIso()} value={date} onChange={(e) => { setDate(e.target.value); setLaterOccurrence(false); }} />
        </div>
        <div className="field">
          <label htmlFor="time">Time of birth</label>
          <input id="time" type="time" required value={time} onChange={(e) => { setTime(e.target.value); setLaterOccurrence(false); }} />
        </div>
      </div>

      <div className="field">
        <span className="label">Birthplace</span>
        <PlaceSearch
          selected={place}
          onSelect={(p) => {
            setPlace(p);
            setPlaceMissing(false);
            setLaterOccurrence(false);
          }}
        />
        {placeMissing && !place && (
          <p className="hint hint-error" role="alert">
            Search and choose your birthplace from the list.
          </p>
        )}
      </div>

      {timeChoices.length > 1 && (
        <fieldset className="dst-choice">
          <legend>This local time happened twice when clocks changed</legend>
          <p className="muted small">Choose the offset shown on the birth record. If it does not say, the earlier occurrence is the usual default.</p>
          {timeChoices.map((choice, index) => (
            <label key={choice.instant}>
              <input type="radio" name="dst-occurrence" checked={laterOccurrence === (index === 1)} onChange={() => setLaterOccurrence(index === 1)} />
              {index === 0 ? 'Earlier occurrence' : 'Later occurrence'} · {choice.label}
            </label>
          ))}
        </fieldset>
      )}
      {skippedByClockChange && <p className="hint hint-error" role="alert">Clocks skipped over this local time at this birthplace. Check the time or date on the birth record.</p>}

      <div className="field">
        <label htmlFor="ayanamsa">Ayanamsa <span className="optional">(advanced; Lahiri is the standard)</span></label>
        <select id="ayanamsa" value={ayanamsa} onChange={(e) => setAyanamsa(e.target.value as Ayanamsa)}>
          {AYANAMSA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="house-system">House system <span className="optional">(advanced)</span></label>
          <select id="house-system" value={houseSystem} onChange={(e) => setHouseSystem(e.target.value as HouseSystem)}>
            <option value="WHOLE_SIGN">Whole sign</option>
            <option value="EQUAL">Equal house</option>
          </select>
        </div>
        <div className="field setting-toggle">
          <span className="label">Lunar node</span>
          <label className="toggle-row" htmlFor="true-node">
            <input id="true-node" type="checkbox" checked={trueNode} onChange={(e) => setTrueNode(e.target.checked)} />
            <span>Use true node (default: mean)</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <button type="submit" className="button-primary" disabled={loading || skippedByClockChange}>
        {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
        {loading ? 'Preparing your chart…' : 'Show my chart'}
      </button>
    </form>
  );
}
