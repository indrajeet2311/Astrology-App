import { formatDate, todayIso } from '../format';
import type { Dasha } from '../types';

const isCurrent = (p: { start: string; end: string }, today: string) => p.start <= today && today < p.end;

export function DashaTimeline({ dashas }: { dashas: Dasha[] }) {
  const today = todayIso();
  return (
    <div className="dasha-list">
      {dashas.map((d) => {
        const current = isCurrent(d, today);
        return (
          <details key={d.start} className={current ? 'dasha is-current' : 'dasha'} open={current}>
            <summary>
              <strong>{d.lord}</strong>
              <span className="muted">
                {formatDate(d.start)} – {formatDate(d.end)}
              </span>
              {current && <span className="badge">Running now</span>}
            </summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Antardasha</th>
                    <th scope="col">From</th>
                    <th scope="col">To</th>
                  </tr>
                </thead>
                <tbody>
                  {d.antardashas.map((a) => (
                    <tr key={a.start} className={isCurrent(a, today) ? 'is-current-row' : undefined}>
                      <th scope="row">
                        {d.lord}–{a.lord}
                      </th>
                      <td className="num">{formatDate(a.start)}</td>
                      <td className="num">{formatDate(a.end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}
