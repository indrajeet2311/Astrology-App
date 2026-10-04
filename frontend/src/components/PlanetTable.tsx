import { SIGN_GLYPHS } from '../constants';
import { formatDegrees } from '../format';
import type { Position } from '../types';

const DIGNITY_LABEL = { EXALTED: 'Exalted', DEBILITATED: 'Debilitated', OWN: 'Own sign' } as const;

function PlanetStates({ p }: { p: Position }) {
  const states: { label: string; tone: string }[] = [];
  if (p.dignity) states.push({ label: DIGNITY_LABEL[p.dignity], tone: p.dignity === 'DEBILITATED' ? 'bad' : 'good' });
  if (p.combust) states.push({ label: 'Combust', tone: 'bad' });
  if (p.vargottama) states.push({ label: 'Vargottama', tone: 'good' });
  if (states.length === 0) return <span className="muted">—</span>;
  return (
    <span className="states">
      {states.map((s) => (
        <span key={s.label} className={`chip chip-${s.tone}`}>
          {s.label}
        </span>
      ))}
    </span>
  );
}

export function PlanetTable({ bodies, division = 'D1' }: { bodies: Position[]; division?: string }) {
  const isRashi = division === 'D1';
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Body</th>
            <th scope="col">Sign</th>
            {isRashi && <th scope="col">Degree</th>}
            <th scope="col">House</th>
            <th scope="col">Nakshatra</th>
            <th scope="col">Motion</th>
            {isRashi && <th scope="col">State</th>}
          </tr>
        </thead>
        <tbody>
          {bodies.map((p) => (
            <tr key={p.name}>
              <th scope="row">{p.name}</th>
              <td>
                <span className="glyph" aria-hidden>
                  {SIGN_GLYPHS[p.signNumber - 1]}
                </span>{' '}
                {p.sign}
              </td>
              {isRashi && <td className="num">{formatDegrees(p.degreeInSign)}</td>}
              <td className="num">{p.house}</td>
              <td>
                {p.nakshatra} <span className="muted">pada {p.pada}</span>
              </td>
              <td>{p.name === 'Ascendant' ? '—' : p.retrograde ? 'Retrograde' : 'Direct'}</td>
              {isRashi && <td><PlanetStates p={p} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
