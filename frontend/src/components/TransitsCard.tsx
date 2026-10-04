import { useEffect, useState } from 'react';
import { SIGN_GLYPHS } from '../constants';
import { dateInTimeZone, formatDegrees } from '../format';
import type { Position, Transits } from '../types';

interface Props {
  natal: Position[];
  transits: Transits;
  timeZone: string;
  loading: boolean;
  error: string;
  onDateChange: (date: string) => void;
}

export function TransitsCard({ natal, transits, timeZone, loading, error, onDateChange }: Props) {
  const [date, setDate] = useState(() => dateInTimeZone(transits.asOf, timeZone));
  const { sadeSati } = transits;
  const asOf = new Date(transits.asOf).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  useEffect(() => setDate(dateInTimeZone(transits.asOf, timeZone)), [transits.asOf, timeZone]);
  return (
    <section className="card">
      <div className="transit-head">
        <div>
          <h2>Transits (Gochar)</h2>
          <p className="muted small">Positions are calculated at noon in the birth location's timezone.</p>
        </div>
        <div className="transit-date-control no-print">
          <label htmlFor="transit-date">Transit date</label>
          <input id="transit-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <button type="button" className="button-ghost" disabled={loading || !date} onClick={() => onDateChange(date)}>
            {loading ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
      <p className="muted small">
        Planet positions as of {asOf}. House numbers count from your natal Ascendant.
      </p>
      {error && <p className="alert" role="alert">{error}</p>}
      <p className={sadeSati.active ? 'banner banner-warn' : 'banner'}>
        <strong>Sade Sati: {sadeSati.active ? `active (${sadeSati.phase})` : 'not active'}.</strong> {sadeSati.description}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Planet</th>
              <th scope="col">Now in</th>
              <th scope="col">Degree</th>
              <th scope="col">House</th>
              <th scope="col">Natal sign</th>
              <th scope="col">Motion</th>
            </tr>
          </thead>
          <tbody>
            {transits.planets.map((p) => {
              const birth = natal.find((n) => n.name === p.name);
              return (
                <tr key={p.name}>
                  <th scope="row">{p.name}</th>
                  <td>
                    <span className="glyph" aria-hidden>
                      {SIGN_GLYPHS[p.signNumber - 1]}
                    </span>{' '}
                    {p.sign}
                  </td>
                  <td className="num">{formatDegrees(p.degreeInSign)}</td>
                  <td className="num">{p.house}</td>
                  <td>{birth?.sign ?? '—'}</td>
                  <td>{p.retrograde ? 'Retrograde' : 'Direct'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
