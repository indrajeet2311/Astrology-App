import { SIGN_GLYPHS } from '../constants';
import { formatDegrees } from '../format';
import type { Position, Transits } from '../types';

export function TransitsCard({ natal, transits }: { natal: Position[]; transits: Transits }) {
  const { sadeSati } = transits;
  const asOf = new Date(transits.asOf).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <section className="card">
      <h2>Current transits (Gochar)</h2>
      <p className="muted small">
        Planet positions as of {asOf}. House numbers count from your natal Ascendant.
      </p>
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
