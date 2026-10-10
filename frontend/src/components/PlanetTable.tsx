import { SIGN_GLYPHS } from '../constants';
import { formatDegrees } from '../format';
import { compoundRelations, signStatus } from '../vargas';
import type { Relation, Seven } from '../vargas';
import type { Chart, Position } from '../types';
import { charaKarakas } from '../jaimini';

const DIGNITY_LABEL = { EXALTED: 'Exalted', DEBILITATED: 'Debilitated', OWN: 'Own sign' } as const;
const NATURAL_LABEL = { Friend: 'Friendly sign', Neutral: 'Neutral sign', Enemy: 'Enemy sign' } as const;
const NATURAL_TONE = { Friend: 'good', Neutral: 'neutral', Enemy: 'bad' } as const;

function PlanetStates({ p, relations }: { p: Position; relations: Record<Seven, Record<Seven, Relation>> | null }) {
  const states: { label: string; tone: string; title?: string }[] = [];
  if (p.dignity) states.push({ label: DIGNITY_LABEL[p.dignity], tone: p.dignity === 'DEBILITATED' ? 'bad' : 'good' });
  const status = relations ? signStatus(p, relations) : null;
  if (status) {
    states.push({
      label: NATURAL_LABEL[status.natural], tone: NATURAL_TONE[status.natural],
      title: `${p.name} is in ${status.lord}'s sign. Natural relation: ${status.natural.toLowerCase()}. Combined with temporary friendships: ${status.compoundLabel}.`,
    });
    if (status.differs) {
      states.push({
        label: `Combined: ${status.compoundLabel}`, tone: status.compound === 'Shatru' || status.compound === 'Adhi Shatru' ? 'bad' : status.compound === 'Sama' ? 'neutral' : 'good',
        title: 'Natural friendship adjusted by where the two planets sit from each other in this chart (panchadha maitri).',
      });
    }
  }
  if (p.combust) states.push({ label: 'Combust', tone: 'bad' });
  if (p.vargottama) states.push({ label: 'Vargottama', tone: 'good' });
  if (states.length === 0) return <span className="muted">—</span>;
  return (
    <span className="states">
      {states.map((s) => (
        <span key={s.label} className={`chip chip-${s.tone}`} title={s.title}>
          {s.label}
        </span>
      ))}
    </span>
  );
}

export function PlanetTable({ bodies, division = 'D1', chart }: { bodies: Position[]; division?: string; chart?: Chart }) {
  const isRashi = division === 'D1';
  const relations = chart ? compoundRelations(chart) : null;
  const karakaByPlanet = chart && isRashi
    ? new Map(charaKarakas(chart).map((karaka) => [karaka.planet.name, karaka]))
    : new Map();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Body</th>
            {isRashi && <th scope="col">Jaimini karaka</th>}
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
              <th scope="row" title={`${p.name}: ${p.sign} ${formatDegrees(p.degreeInSign)}, ${p.nakshatra} pada ${p.pada}; house ${p.house}${p.retrograde ? '; retrograde' : ''}${p.dignity ? `; ${p.dignity.toLowerCase()}` : ''}${p.combust ? '; combust' : ''}${p.vargottama ? '; Vargottama' : ''}`}>
                {p.name}
              </th>
              {isRashi && (() => {
                const karaka = karakaByPlanet.get(p.name);
                return <td>{karaka ? <span className="chip chip-karaka" title={karaka.meaning}>{karaka.code} · {karaka.name}</span> : <span className="muted">—</span>}</td>;
              })()}
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
              {isRashi && <td><PlanetStates p={p} relations={relations} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
